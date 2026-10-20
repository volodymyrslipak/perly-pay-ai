/**
 * Everything this API asks Perly Pay. Perly Pay is the ledger: every paid
 * pack is an entitlement with credits, and spending is one atomic call.
 */
import { PerlyPay, PerlyPayError } from "perly-pay";

try {
  process.loadEnvFile(); // .env, when there is one
} catch {}

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} (see .env.example).`);
  return value;
}

export const pay = new PerlyPay(need("PERLY_PAY_SECRET_KEY"), { baseUrl: process.env.PERLY_PAY_API || undefined });
const PRODUCT = () => need("PERLY_PAY_CREDITS_PRODUCT_ID");

/** Your user, as a Perly Pay customer: found by `external_id`, made the first time. */
export async function customerFor(userId: string) {
  const found = await pay.customers.list({ external_id: userId, limit: 1 });
  return found.data[0] ?? (await pay.customers.create({ external_id: userId }, { idempotencyKey: `customer-${userId}` }));
}

/** The buyer's own top-up page: stable, it lists the packs and opens an invoice for the one they pick. */
export async function topUp(userId: string) {
  await customerFor(userId);
  return { url: await pay.credits.topUpUrl(userId, { product: PRODUCT() }) };
}

export async function balance(userId: string): Promise<number> {
  await customerFor(userId);
  return (await pay.credits.balance(userId, { product: PRODUCT() })).balance;
}

/**
 * Spends `cost` credits for one request, once: the same `requestId` again
 * returns the first spend instead of spending twice — even days later.
 */
export async function spend(userId: string, cost: number, requestId: string, action = "api"): Promise<{ ok: boolean; remaining: number }> {
  try {
    const usage = await pay.credits.consume(userId, cost, { product: PRODUCT(), action, idempotencyKey: `req-${userId}-${requestId}` });
    return { ok: true, remaining: usage.balance };
  } catch (error) {
    if (!(error instanceof PerlyPayError)) throw error;
    // Too few left (two requests at once, or none bought yet): the normal "top up" case, not a 500.
    if (error.code === "insufficient_credits") return { ok: false, remaining: await balance(userId) };
    // A user who never bought anything is not a Perly Pay customer yet.
    if (error.code === "resource_missing" && error.param === "customer") return { ok: false, remaining: await balance(userId) };
    throw error;
  }
}
