/**
 * Run once per mode (test, then live): makes the credit pack and prints
 * the ids for .env. With PUBLIC_URL set, also registers the webhook.
 *
 *   npm run setup
 *   PUBLIC_URL=https://your-tunnel.example npm run setup
 */
import { pay } from "../src/perly.js";

const product = await pay.products.create({ name: "API credits", description: "1 credit = 1 API call" });
const price = await pay.prices.create({ product: product.id, model: "credit_pack", unit_amount: 500, credits: 500, currency: "USD" }); // $5.00 for 500

console.log(`# ${pay.mode} mode — add to .env`);
console.log(`PERLY_PAY_CREDITS_PRODUCT_ID=${product.id}`);
console.log(`PERLY_PAY_CREDITS_PRICE_ID=${price.id}`);

if (process.env.PUBLIC_URL) {
  const endpoint = await pay.webhookEndpoints.create({ url: `${process.env.PUBLIC_URL.replace(/\/$/, "")}/webhooks/perly`, enabled_events: ["invoice.fulfilled"] });
  console.log(`PERLY_PAY_WEBHOOK_SECRET=${endpoint.secret}`);
}
