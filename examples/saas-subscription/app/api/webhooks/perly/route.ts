import { pay } from "@/lib/perly";
import { store } from "@/lib/store";

/**
 * Perly Pay's signed events. Verify on the raw body, handle each event id
 * once, answer fast. Access itself is read with entitlements.check; this
 * keeps the app's own record (which subscription is whose) and is where a
 * real app sends "welcome", "renewal due" and "your plan ended".
 */
export async function POST(request: Request) {
  const secret = process.env.PERLY_PAY_WEBHOOK_SECRET;
  if (!secret) return new Response("set PERLY_PAY_WEBHOOK_SECRET", { status: 503 });
  let event;
  try {
    event = pay().webhooks.verify(await request.text(), request.headers.get("perly-signature"), secret);
  } catch {
    return new Response("bad signature", { status: 400 });
  }
  if (store.events.has(event.id)) return new Response(null, { status: 204 });
  store.events.add(event.id);

  const object = (event.data.object ?? {}) as { subscription?: string | null; metadata?: Record<string, string>; customer_email?: string | null };
  switch (event.type) {
    case "invoice.fulfilled": {
      // The first payment and every renewal. Grant here, never on the redirect.
      const user = object.metadata?.user ?? object.customer_email ?? null;
      if (user && object.subscription) store.subscriptions.set(user, { subscription: object.subscription, status: "active" });
      break;
    }
    case "subscription.past_due":
    case "subscription.unpaid":
    case "subscription.ended":
      for (const row of store.subscriptions.values()) if (row.subscription === event.object_id) row.status = event.type.split(".")[1]!;
      break;
  }
  return new Response(null, { status: 204 });
}
