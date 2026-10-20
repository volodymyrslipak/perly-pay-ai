/**
 * Run once per mode (test, then live): the Pro plan as a monthly
 * subscription. Prints the ids for .env.local; with PUBLIC_URL set, also
 * registers the webhook and prints its secret.
 *
 *   npm run setup
 *   PUBLIC_URL=https://your-tunnel.example npm run setup
 */
import { PerlyPay } from "perly-pay";

try {
  process.loadEnvFile(".env.local");
} catch {}
const pay = new PerlyPay(process.env.PERLY_PAY_SECRET_KEY ?? "", { baseUrl: process.env.PERLY_PAY_API || undefined });

const product = await pay.products.create({ name: "Pro" });
const price = await pay.prices.create({
  product: product.id,
  model: "subscription",
  unit_amount: 900, // $9.00
  currency: "USD",
  recurring: { interval: "month", grace_days: 3 },
});
console.log(`# ${pay.mode} mode — add to .env.local`);
console.log(`PERLY_PAY_PRO_PRODUCT_ID=${product.id}`);
console.log(`PERLY_PAY_PRO_PRICE_ID=${price.id}`);
if (process.env.PUBLIC_URL) {
  const endpoint = await pay.webhookEndpoints.create({
    url: `${process.env.PUBLIC_URL.replace(/\/$/, "")}/api/webhooks/perly`,
    enabled_events: ["invoice.fulfilled", "subscription.past_due", "subscription.unpaid", "subscription.ended"],
  });
  console.log(`PERLY_PAY_WEBHOOK_SECRET=${endpoint.secret}`);
}
