/**
 * A Telegram bot with one paid command, and no framework: Telegram's Bot
 * API over fetch (long polling), Perly Pay over its SDK, and a small HTTP
 * listener for Perly Pay's webhooks.
 *
 *   /buy     your own invoice link (bitcoin, USDC or USDT)
 *   /status  free or paid
 *   /secret  the paid command
 *
 * Who paid is asked of Perly Pay (entitlements.check), so a restart loses nothing.
 */
import { createServer } from "node:http";
import { PerlyPay } from "perly-pay";

try {
  process.loadEnvFile();
} catch {}

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} (see .env.example).`);
  return value;
}

const pay = new PerlyPay(need("PERLY_PAY_SECRET_KEY"), { baseUrl: process.env.PERLY_PAY_API || undefined });
const TOKEN = need("TELEGRAM_BOT_TOKEN");
const PRODUCT = need("PERLY_PAY_PRODUCT_ID");
const PRICE = need("PERLY_PAY_PRICE_ID");

interface Update {
  update_id: number;
  message?: { chat: { id: number }; from?: { id: number }; text?: string };
}

async function tg<T = unknown>(method: string, body: object): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`Telegram ${method}: ${json.description}`);
  return json.result;
}

const say = (chatId: number, text: string, extra: object = {}) => tg("sendMessage", { chat_id: chatId, text, ...extra });

/** A Telegram user as a Perly Pay customer, keyed by their id. */
async function customerFor(userId: number) {
  const externalId = `tg:${userId}`;
  const found = await pay.customers.list({ external_id: externalId, limit: 1 });
  return found.data[0] ?? (await pay.customers.create({ external_id: externalId }, { idempotencyKey: `customer-${externalId}` }));
}

async function hasAccess(userId: number): Promise<boolean> {
  return (await pay.entitlements.check({ customer_external_id: `tg:${userId}`, product: PRODUCT })).has_access;
}

async function onMessage(chatId: number, userId: number, text: string) {
  if (text.startsWith("/buy")) {
    if (await hasAccess(userId)) return say(chatId, "You already have it. Try /secret.");
    const customer = await customerFor(userId);
    const invoice = await pay.invoices.create(
      { line_items: [{ price: PRICE }], customer: customer.id, metadata: { telegram_user_id: String(userId), chat_id: String(chatId) } },
      { idempotencyKey: `buy-${userId}-${new Date().toISOString().slice(0, 10)}` }, // a spammed /buy opens one invoice a day
    );
    return say(chatId, "Pay with bitcoin, USDC or USDT. I'll message you when it's confirmed.", {
      reply_markup: { inline_keyboard: [[{ text: "Pay", url: invoice.url }]] },
    });
  }
  if (text.startsWith("/status")) return say(chatId, (await hasAccess(userId)) ? "Paid. /secret is yours." : "Free. /buy to unlock /secret.");
  if (text.startsWith("/secret")) return say(chatId, (await hasAccess(userId)) ? "The secret: the money went straight to my wallet." : "That one is paid. /buy");
  return say(chatId, "Commands: /buy, /status, /secret");
}

/** Long polling: Telegram holds each request up to 30 s until there is news. */
async function poll() {
  let offset = 0;
  for (;;) {
    try {
      const updates = await tg<Update[]>("getUpdates", { offset, timeout: 30, allowed_updates: ["message"] });
      for (const u of updates) {
        offset = u.update_id + 1;
        const m = u.message;
        if (m?.text && m.from) await onMessage(m.chat.id, m.from.id, m.text).catch((e) => console.error(e));
      }
    } catch (error) {
      console.error(error);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

/** Perly Pay's webhooks: verify on the raw body, each event once, then tell the buyer. */
const seen = new Set<string>(); // a real bot keeps these in its database
createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/webhooks/perly") return void res.writeHead(404).end();
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  let event;
  try {
    event = pay.webhooks.verify(Buffer.concat(chunks), req.headers["perly-signature"] as string | undefined, need("PERLY_PAY_WEBHOOK_SECRET"));
  } catch {
    return void res.writeHead(400).end("bad signature");
  }
  res.writeHead(204).end(); // answer fast; work after
  if (seen.has(event.id)) return;
  seen.add(event.id);
  if (event.type === "invoice.fulfilled") {
    const invoice = event.data.object as { metadata?: Record<string, string> } | null;
    const chatId = Number(invoice?.metadata?.chat_id);
    if (chatId) await say(chatId, "Payment confirmed. /secret is yours.").catch((e) => console.error(e));
  }
}).listen(Number(process.env.PORT ?? 8788), () => console.log(`webhooks on :${process.env.PORT ?? 8788}/webhooks/perly (${pay.mode} mode)`));

void poll();
