/**
 * Test mode only: buys one copy as a buyer would and prints the key, with
 * no wallet. In production you send the key yourself — on `license.created`
 * or `invoice.fulfilled` (see the recipe).
 *
 *   npm run buy-test -- you@example.com
 */
import { PerlyPay } from "perly-pay";

try {
  process.loadEnvFile();
} catch {}
const pay = new PerlyPay(process.env.PERLY_PAY_SECRET_KEY ?? "", { baseUrl: process.env.PERLY_PAY_API || undefined });
if (pay.mode !== "test") throw new Error("buy-test runs with a sk_test_ key only.");
const product = process.env.PERLY_PAY_PRODUCT_ID;
if (!product) throw new Error("Set PERLY_PAY_PRODUCT_ID (npm run setup).");

const email = process.argv[2] ?? "buyer@example.com";
const prices = await pay.prices.list({ product, active: true, limit: 1 });
const price = prices.data[0];
if (!price) throw new Error("The product has no active price.");

const invoice = await pay.invoices.create({ line_items: [{ price: price.id }], customer: { email } });
await pay.invoices.simulate(invoice.id); // paid and fulfilled: the key is issued now
const paid = await pay.invoices.retrieve(invoice.id);
const keys = await pay.licenseKeys.list({ customer: paid.customer ?? undefined, product, limit: 100 });
const key = keys.data.find((k) => k.entitlement && k.status === "active");
console.log(key ? key.key : "No key yet — is issues_license on for the product?");
