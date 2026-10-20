/**
 * Run once per mode: the product and a one-time price for the paid
 * command. With PUBLIC_URL set (where the bot's webhook listener is
 * reachable), also registers the webhook and prints its secret.
 */
import { PerlyPay } from "perly-pay";

try {
  process.loadEnvFile();
} catch {}
const pay = new PerlyPay(process.env.PERLY_PAY_SECRET_KEY ?? "", { baseUrl: process.env.PERLY_PAY_API || undefined });

const product = await pay.products.create({ name: "Bot: the secret command" });
const price = await pay.prices.create({ product: product.id, model: "one_time", unit_amount: 300, currency: "USD" }); // $3.00
console.log(`# ${pay.mode} mode — add to .env`);
console.log(`PERLY_PAY_PRODUCT_ID=${product.id}`);
console.log(`PERLY_PAY_PRICE_ID=${price.id}`);
if (process.env.PUBLIC_URL) {
  const endpoint = await pay.webhookEndpoints.create({ url: `${process.env.PUBLIC_URL.replace(/\/$/, "")}/webhooks/perly`, enabled_events: ["invoice.fulfilled"] });
  console.log(`PERLY_PAY_WEBHOOK_SECRET=${endpoint.secret}`);
}
