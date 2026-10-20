/** Run once per mode: the credit pack the tools spend. Prints the ids for .env. */
import { PerlyPay } from "perly-pay";

try {
  process.loadEnvFile();
} catch {}
const pay = new PerlyPay(process.env.PERLY_PAY_SECRET_KEY ?? "", { baseUrl: process.env.PERLY_PAY_API || undefined });

const product = await pay.products.create({ name: "Tool credits", description: "Credits for paid MCP tools" });
const price = await pay.prices.create({ product: product.id, model: "credit_pack", unit_amount: 300, credits: 100, currency: "USD" }); // $3.00 for 100
console.log(`# ${pay.mode} mode — add to .env`);
console.log(`PERLY_PAY_CREDITS_PRODUCT_ID=${product.id}`);
console.log(`PERLY_PAY_CREDITS_PRICE_ID=${price.id}`);
