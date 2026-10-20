/**
 * A tiny paid API. Every call to /v1/* costs one credit; a short balance
 * answers 402 with a link to top up in bitcoin, USDC or USDT.
 *
 *   POST /top-up            → { url }      the buyer's own top-up page (pick a pack, pay)
 *   GET  /balance           → { credits }
 *   POST /v1/shout {text}   → { text }     the paid endpoint (1 credit)
 *   POST /webhooks/perly                   Perly Pay's signed events
 *
 * Callers say who they are with `Authorization: Bearer demo-<user id>`.
 * That is the demo's whole auth: put your own API keys here.
 */
import { serve } from "@hono/node-server";
import { Hono, type Context } from "hono";
import { randomUUID } from "node:crypto";
import { balance, pay, spend, topUp } from "./perly.js";

const COST = 1;
const app = new Hono<{ Variables: { userId: string } }>();
const seen = new Set<string>(); // event ids already handled; a real app keeps them in its database

function userOf(c: Context): string | null {
  const m = /^Bearer demo-([A-Za-z0-9_-]{1,64})$/.exec(c.req.header("authorization") ?? "");
  return m?.[1] ?? null;
}

app.use("/top-up", auth);
app.use("/balance", auth);
app.use("/v1/*", auth);

async function auth(c: Context<{ Variables: { userId: string } }>, next: () => Promise<void>) {
  const userId = userOf(c);
  if (!userId) return c.json({ error: "unauthorized", hint: "Authorization: Bearer demo-<user id>" }, 401);
  c.set("userId", userId);
  await next();
}

app.post("/top-up", async (c) => c.json(await topUp(c.get("userId"))));

app.get("/balance", async (c) => c.json({ credits: await balance(c.get("userId")) }));

// Spend first, then work: a crash after spending never gives the work away twice.
app.use("/v1/*", async (c, next) => {
  const userId = c.get("userId");
  const requestId = c.req.header("idempotency-key") ?? randomUUID(); // a client's retry sends the same key
  const result = await spend(userId, COST, requestId);
  c.header("X-Credits-Remaining", String(result.remaining));
  if (!result.ok) return c.json({ error: "out_of_credits", credits: result.remaining, top_up: (await topUp(userId)).url }, 402);
  await next();
});

app.post("/v1/shout", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { text?: unknown };
  const text = typeof body.text === "string" ? body.text.slice(0, 1000) : "";
  return c.json({ text: text.toUpperCase() });
});

app.post("/webhooks/perly", async (c) => {
  const secret = process.env.PERLY_PAY_WEBHOOK_SECRET;
  if (!secret) return c.text("set PERLY_PAY_WEBHOOK_SECRET", 503);
  let event;
  try {
    event = pay.webhooks.verify(await c.req.text(), c.req.header("perly-signature"), secret); // the raw body
  } catch {
    return c.text("bad signature", 400);
  }
  if (seen.has(event.id)) return c.body(null, 204);
  seen.add(event.id);
  if (event.type === "invoice.fulfilled") {
    const invoice = event.data.object as { metadata?: Record<string, string> } | null;
    console.log(`credits added for ${invoice?.metadata?.user_id ?? "someone"}`);
  }
  return c.body(null, 204);
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, () => console.log(`api-credits on http://localhost:${port} (${pay.mode} mode)`));
