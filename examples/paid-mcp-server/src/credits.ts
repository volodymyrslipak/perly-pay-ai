/**
 * Credits per tool call. A human buys a pack once (an invoice in their
 * browser); each call checks the balance, spends with an idempotency key,
 * then runs. Nothing is debited on its own, and the agent never pays.
 */
import { PerlyPay, PerlyPayError } from "perly-pay";
import { randomUUID } from "node:crypto";

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} (see .env.example).`);
  return value;
}

export const pay = new PerlyPay(need("PERLY_PAY_SECRET_KEY"), { baseUrl: process.env.PERLY_PAY_API || undefined });
const PRODUCT = () => need("PERLY_PAY_CREDITS_PRODUCT_ID");
async function customerFor(userId: string) {
  const found = await pay.customers.list({ external_id: userId, limit: 1 });
  return found.data[0] ?? (await pay.customers.create({ external_id: userId }, { idempotencyKey: `customer-${userId}` }));
}

/** The person's own top-up page: stable, it lists the packs and opens an invoice for the one they pick. */
export async function topUpUrl(userId: string): Promise<string> {
  await customerFor(userId);
  return pay.credits.topUpUrl(userId, { product: PRODUCT() });
}

export async function balance(userId: string): Promise<number> {
  await customerFor(userId);
  return (await pay.credits.balance(userId, { product: PRODUCT() })).balance;
}

/**
 * Spends `cost` credits for one tool call. Null when spent; otherwise the
 * words to show the person (with their top-up link).
 */
export async function charge(userId: string, cost: number, tool: string): Promise<string | null> {
  try {
    // A fresh key per call, made here (the SDK keeps it across its own retries). Never the client's JSON-RPC id:
    // the client picks it, and the same key again returns the first spend, so the tool would run again for free.
    await pay.credits.consume(userId, cost, { product: PRODUCT(), action: tool, idempotencyKey: `mcp-${randomUUID()}` });
    return null;
  } catch (error) {
    const short = error instanceof PerlyPayError && (error.code === "insufficient_credits" || (error.code === "resource_missing" && error.param === "customer"));
    if (!short) throw error;
  }
  return `Out of credits: ${await balance(userId)} left, this tool costs ${cost}. A person can top up here (bitcoin, USDC or USDT): ${await topUpUrl(userId)} — then retry.`;
}
