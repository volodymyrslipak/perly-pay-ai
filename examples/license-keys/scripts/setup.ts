/**
 * The seller's side, run once per mode: the product (it issues license
 * keys, three devices each), a one-time price and a payment link to put on
 * your site. Needs the secret key; the app never does.
 */
import { PerlyPay } from "perly-pay";

try {
  process.loadEnvFile();
} catch {}
const pay = new PerlyPay(process.env.PERLY_PAY_SECRET_KEY ?? "", { baseUrl: process.env.PERLY_PAY_API || undefined });

const product = await pay.products.create({ name: "Reverser Pro", issues_license: true, license_activation_limit: 3 });
const price = await pay.prices.create({ product: product.id, model: "one_time", unit_amount: 1900, currency: "USD" }); // $19.00
const link = await pay.paymentLinks.create({ price: price.id });

console.log(`# ${pay.mode} mode — add to .env`);
console.log(`PERLY_PAY_PRODUCT_ID=${product.id}`);
console.log(`# Sell it here: ${link.url}`);
