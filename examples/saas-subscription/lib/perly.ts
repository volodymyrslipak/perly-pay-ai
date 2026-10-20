/**
 * Everything the app asks Perly Pay. Access is one question —
 * `entitlements.check` — so the app never counts days or trusts a redirect.
 */
import { PerlyPay } from "perly-pay";

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} (see .env.example).`);
  return value;
}

let client: PerlyPay | null = null;
export function pay(): PerlyPay {
  client ??= new PerlyPay(need("PERLY_PAY_SECRET_KEY"), { baseUrl: process.env.PERLY_PAY_API || undefined });
  return client;
}

/** The demo's users are their email addresses. A real app uses its own user id as `external_id`. */
export async function customerFor(email: string) {
  const found = await pay().customers.list({ external_id: email, limit: 1 });
  return found.data[0] ?? (await pay().customers.create({ external_id: email, email }, { idempotencyKey: `customer-${email}` }));
}

/** Opens the subscription and its first invoice; paying it makes the plan active. Renewals come as invoices too. */
export async function subscribe(email: string) {
  const customer = await customerFor(email);
  const day = new Date().toISOString().slice(0, 10);
  const invoice = await pay().invoices.create(
    {
      line_items: [{ price: need("PERLY_PAY_PRO_PRICE_ID") }],
      customer: customer.id,
      metadata: { user: email },
      return_url: `${process.env.APP_URL ?? "http://localhost:3000"}/pro?user=${encodeURIComponent(email)}`,
    },
    { idempotencyKey: `subscribe-${email}-${day}` }, // a double click opens one invoice
  );
  return { invoice: invoice.id, subscription: invoice.subscription, url: invoice.url };
}

export async function access(email: string) {
  const check = await pay().entitlements.check({ customer_external_id: email, product: need("PERLY_PAY_PRO_PRODUCT_ID") });
  return { has_access: check.has_access, ends_at: check.ends_at, customer: check.customer };
}

/** A link where the buyer pays an open renewal, prepays, or cancels. */
export async function portal(email: string) {
  const customer = await customerFor(email);
  return (await pay().portalSessions.create({ customer: customer.id, return_url: `${process.env.APP_URL ?? "http://localhost:3000"}/pro?user=${encodeURIComponent(email)}` })).url;
}
