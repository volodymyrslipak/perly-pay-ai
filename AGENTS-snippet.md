<!-- BEGIN perly-pay (paste into your AGENTS.md; update from https://pay.perly.io/docs/recipes) -->
<!-- Generated from skills/: edit the skills, not this file. -->

# Payments: Perly Pay

This project takes crypto payments (bitcoin, USDC, USDT) with Perly Pay. Money goes straight to the seller's wallet. SDKs: `perly-pay` (npm), `perly/perly-pay` (Composer). Docs and runnable examples: https://pay.perly.io/docs/recipes.

## Ground rules (every Perly Pay integration)

1. **Test mode first.** Build with a `sk_test_…` key: test networks, nothing real moves, `invoices.simulate` pays an invoice for you. Switch to `sk_live_…` only in the go-live step. Test and live are separate worlds: products, prices, customers, webhook endpoints and their secrets made with a test key do not exist in live.
2. **The secret key stays on the server.** Read it from `PERLY_PAY_SECRET_KEY`. Never put it in a browser bundle, a mobile or desktop app, a bot's client, a public repo or a log. Software you ship checks licenses with `LicenseClient`, which needs no key.
3. **Never trust the redirect.** A buyer landing on your `return_url` proves nothing. Grant access only from a verified `invoice.fulfilled` webhook, or from your server asking `entitlements.check`.
4. **Grant on `invoice.fulfilled`, not `invoice.paid`.** Fulfilled comes once per invoice, after the payment cleared screening. A payment held for review is paid but not fulfilled.
5. **Verify every webhook** on the raw body with the endpoint's `whsec_…` secret (`Perly-Signature`, five minutes of tolerance). A delivery can come twice: act once per event `id`. Answer 2xx fast; failures are retried for 72 hours.
6. **Idempotency.** The SDK sends an `Idempotency-Key` on every POST and reuses it on retries (without the SDK, send one yourself). Pass your own (`order-<id>`, `req-<id>`) when your code may repeat an action, such as spending credits or opening an order's invoice.
7. **Money is integers.** Fiat amounts are minor units next to a `currency`: `4900` is $49.00. Only `USD` and `EUR`. Never floats. On-chain amounts are integer strings in the asset's smallest unit.
8. **Non-custodial, no auto-debit.** Buyers pay BTC, USDC or USDT straight to the seller's wallet; Perly Pay never holds money. Subscriptions renew by an invoice and reminders the buyer pays each period, never by pulling funds. Refunds are sent by the seller from their own wallet.
9. **Use the SDK:** `npm install perly-pay` (TypeScript, zero dependencies, any runtime with `fetch`). PHP: `perly/perly-pay` is not on Packagist yet, so call the REST API with Guzzle, curl or Laravel's `Http` client and check webhook signatures by hand (the `verify-webhooks` skill shows how); `npx perly-pay init` writes a Laravel integration that does both. Other languages call the REST API at `https://pay.perly.io/api/v1` with `Authorization: Bearer <key>`; the spec is at `https://pay.perly.io/api/v1/openapi.json`. Point the SDK at a local Pay with `PERLY_PAY_API` (`baseUrl` option).

## Recipes

### Add a crypto checkout with Perly Pay

The user wants buyers to pay for something in their app with bitcoin or dollar stablecoins.

1. **Detect the stack.** Read `package.json` (`next`, `express`, `hono`, `fastify`, `@nestjs/core`) or `composer.json` (`laravel/framework`, `symfony/*`). WordPress shop: point to the WooCommerce plugin (`/docs/woocommerce`) instead of code; WHMCS: `/docs/whmcs`; no-code: Zapier or Make. Other languages: the REST API.
2. **Install the SDK** (`npm install perly-pay`; in PHP there is nothing of ours to install yet: call the API with Guzzle or Laravel's `Http`, as below) and add `PERLY_PAY_SECRET_KEY=sk_test_…` and `PERLY_PAY_WEBHOOK_SECRET=` to `.env.example` and the local env file. Ask the user for a test key from Dashboard → Developers → API keys; never invent one and never commit one.
3. **Create the product and price once** — a setup script, not on every request. Keep the ids in env or config (`PERLY_PAY_PRICE_ID`). A one-off sale is `model: "one_time"` with `unit_amount` in minor units.
4. **Open the payment on your server.** Either a **payment link** (a fixed URL, no code per buyer, made once) or, per order, an **invoice** with `customer`, your `metadata` (`order_id`, `user_id`) and a `return_url`, then redirect to `invoice.url`. A **checkout session** does the same for several line items. Pass `idempotencyKey: "order-<id>"` so a double click opens one invoice.
5. **Add the webhook route** that verifies `Perly-Signature` on the raw body, ignores event ids it has seen, and on `invoice.fulfilled` reads `event.data.object.metadata` to grant access or ship the order. See the `verify-webhooks` skill for every framework.
6. **Register the endpoint** in Dashboard → Developers → Webhooks, or with `webhookEndpoints.create`, for `invoice.fulfilled` (plus anything else you show the user). Store the `whsec_…` it returns once.
7. **Test it** without a wallet: create an invoice with the test key, call `invoices.simulate(id)`, and check the route granted access. The `test-and-go-live` skill has the full checklist.
8. **The thank-you page shows status, not access.** It may read the invoice (`invoices.retrieve`) to say "paid, unlocking…", but the unlock itself comes from the webhook.

Code and pitfalls: https://pay.perly.io/docs/recipes

### Sell credits and spend them per request

The user charges for usage: API calls, AI generations, exports, minutes.

1. **Create a credit pack once** per mode: a product and a price with `model: "credit_pack"`, `unit_amount` (minor units) and `credits`. Several packs (1 000, 5 000) are several prices of one product. On the product's page in the dashboard, set the low-balance alert and, if you like, "any amount".
2. **Give each user a customer** with your own id: `customers.create({ external_id: user.id, email })` the first time (find with `customers.list({ external_id })`). From then on the SDK's `credits.*` take that id directly — or a `cus_…` id, or an email.
3. **Top-up:** send the buyer to `credits.topUpUrl(user.id, { product })` — their own stable page that lists the packs and opens an invoice for the one they pick. Every paid pack adds credits.
4. **Per request, spend first:** `credits.consume(user.id, cost, { product, action, idempotencyKey: "req-<user id>-<request id>" })`, then do the work. The answer's `balance` is what is left. Your server makes the request id, one per real request (`crypto.randomUUID()` as the request comes in), and never takes it from the caller: the same key again returns the first spend as a success, even days later, so a caller who resends a key would get the work again without paying. The SDK already keeps one key across its own retries.
5. **Short:** `consume` refuses with `insufficient_credits` (409) and spends nothing — answer **402** with the top-up URL, never a 500. A user who never bought is not a customer yet (`resource_missing` on `customer`): same answer.
6. **Show the balance** with `credits.balance(user.id, { product })` (`balance`, `low`, `top_up_url`), in your UI or a response header such as `X-Credits-Remaining`.
7. **Listen** (optional, see `verify-webhooks`): `credits.low` and `credits.depleted` to nudge, `invoice.fulfilled` to say "credits added". With the buyer's letter on, Perly Pay emails them their top-up link when they run low.
8. **`action`** is your label (`chat`, `image.hd`): the product's page sums spends by action and by customer.

Code and pitfalls: https://pay.perly.io/docs/recipe-api-credits

### Sell a subscription (renewed by invoice)

The user sells access for a period: a Pro plan, a membership, a yearly licence.

1. **Create the plan once** per mode: a product and a price with `model: "subscription"`, `unit_amount` and `recurring: { interval: "month" | "year" | "week" | "day" | "quarter" | "custom_days", trial_days?, grace_days? }`. Monthly and yearly are two prices of one product.
2. **Map users to customers** by `external_id` (your user id) and email — the email is where renewal invoices and reminders go, so it must be real.
3. **Subscribe through the first invoice:** `invoices.create({ line_items: [{ price }], customer, metadata: { user_id }, return_url })` opens the subscription (`status: "unpaid"`, waiting) and its first invoice; redirect the buyer to `invoice.url`. Paying it makes the subscription `active`. (A checkout session with the same price works too.)
4. **Gate features with one call:** `entitlements.check({ customer_external_id: userId, product })` → `has_access` and `ends_at`. Call it on the server (cache for a minute at most), never trust a client flag.
5. **Listen** (see `verify-webhooks`): `invoice.fulfilled` (first payment and every renewal), `subscription.renewal_invoice_opened` (show "renewal due"), `subscription.past_due` / `subscription.unpaid` (warn, then lock), `subscription.canceled` and `subscription.ended`. Store the subscription id on your user from `event.data.object.subscription` of the first `invoice.fulfilled`.
6. **Let buyers manage it:** `portalSessions.create({ customer, return_url })` gives a link where they pay the open renewal, prepay periods or cancel. Cancel from your app with `subscriptions.cancel(id, { at_period_end: true })`.
7. **Plan changes:** `subscriptions.update(id, { price })` — upgrades are invoiced now, prorated; downgrades start next period.
8. **Grace days:** the entitlement covers the paid period. Inside grace days the subscription is `past_due`; whether to keep access then is your choice — read `subscriptions.retrieve(id).status`.
9. **Test:** `invoices.simulate` the first invoice, then check access. The renewal invoice can be simulated too once `subscription.renewal_invoice_opened` arrives (or `subscriptions.prepay(id, { periods: 1 })` opens one now).

Code and pitfalls: https://pay.perly.io/docs/recipe-saas-subscription

### Sell software with license keys

The user ships software that runs on the buyer's machine and wants paid copies unlocked by a key.

1. **Create the product once** with `issues_license: true` and `license_activation_limit` (devices per key, e.g. 3), plus a price: `one_time`, `lifetime`, `fixed_term` (keys expire with the term) or `subscription` (keys follow the paid period).
2. **Sell it** with a payment link (made once, put on the website) or an invoice per buyer. The buyer gives an email at checkout.
3. **Deliver the key yourself:** the receipt does not carry it. Listen for `license.created` (its object is the license key, with `key` and `customer`) or, on `invoice.fulfilled`, read `licenseKeys.list({ customer })`. Email it, show it on the account or thank-you page (after your server confirmed the payment).
4. **In the app — first run or "Enter key":** `LicenseClient.activate({ key, product, instance_name })`. `instance_name` is stable per device (hostname, a generated id saved in the app's config). Store the key and the returned `activation.id` locally.
5. **On every start (or daily):** `LicenseClient.validate({ key, product, instance: activationId })`. `valid: false` with a `reason` (`revoked`, `expired`, `suspended`, `not_activated`, `wrong_product`, `not_found`) → back to the free mode with a short message.
6. **Offline:** if the check cannot reach Perly Pay (`ConnectionError`), keep the last good answer for a grace window (say 7 days) instead of locking a paying user out on a plane.
7. **Moving to a new machine:** `LicenseClient.deactivate({ key, product, instance })` frees a seat. From your server, `licenseKeys.revoke(id)` ends a key (refund, abuse).
8. **Always pass `product`:** a key for another product must not unlock yours.

Code and pitfalls: https://pay.perly.io/docs/recipe-license-keys

### Sell bot access (Telegram, Discord)

A bot sells something to chat users: premium commands, a role, an invite to a private group, a monthly membership.

1. **Create the product and price once** per mode: `one_time` or `lifetime` for "forever", `fixed_term` with `term_days` for passes, `subscription` for memberships renewed by invoice.
2. **Key every user by the chat id:** a customer with `external_id: "tg:<user id>"` (or `discord:<user id>`). Chat users often have no email; ask for one only when you sell a subscription (renewal invoices go there).
3. **On `/buy`:** create an invoice with `customer`, `metadata: { telegram_user_id, chat_id }` and send `invoice.url` as a button. Use `idempotencyKey: "buy-<user>-<day>"` so a spammed command opens one invoice.
4. **Webhook route on your server** (the same process as the bot or another): verify the signature, then on `invoice.fulfilled` read `metadata` and grant — answer the user, create a one-time invite link to the private group, add the Discord role.
5. **Commands check access** with `entitlements.check({ customer_external_id: "tg:<id>", product })` — the bot restarts and loses memory; Perly Pay does not.
6. **Take access away** on `entitlement.revoked` (refund) and, for passes and subscriptions, when `entitlements.check` stops answering `has_access` (run a daily sweep, or react to `subscription.ended`).
7. **Bot tokens are secrets too**: `TELEGRAM_BOT_TOKEN`, `DISCORD_TOKEN` live in env beside `PERLY_PAY_SECRET_KEY`, never in code.

Code and pitfalls: https://pay.perly.io/docs/recipe-telegram-bot

### Paid MCP tools (credits per call)

The user runs an MCP server and wants agents to pay per tool call.

1. **Create a credit pack** once per mode (`model: "credit_pack"`, `unit_amount`, `credits`), as in `sell-credits`. Give each tool a cost in credits (search = 1, report = 10).
2. **Identify the caller.** Remote (HTTP) servers: an API key you issue per user, sent as `Authorization: Bearer …`, mapped to your user id. Local (stdio) servers: the user's own key in the server's `env` (`MY_SERVICE_API_KEY`), never the Perly Pay secret key. Your server — the only place holding `PERLY_PAY_SECRET_KEY` — maps that user to a customer `external_id`.
3. **Wrap every paid tool:** `credits.consume(user, cost, { action: <tool name>, idempotencyKey: "mcp-<fresh id>" })` → run the tool. Spend before running so a crash cannot give free work twice. Your server makes the id for each call; never build it from the client's JSON-RPC request id, which the client chooses.
4. **When the balance is short, return a tool result, not a protocol error:** `isError: true` and text with the top-up URL ("Out of credits: top up at https://…, then retry"). The agent shows it to the human.
5. **Offer two free tools:** `balance` (`credits.balance`) and `top_up` (`credits.topUpUrl`, the person's own top-up page). Agents use them to explain what is going on.
6. **Tell the cost up front** in each tool's description ("Costs 10 credits"). Agents and humans read it.
7. **Test** with a `sk_test_…` key: top up, `invoices.simulate`, call a tool, watch the balance drop.

Code and pitfalls: https://pay.perly.io/docs/recipe-paid-mcp-server

### Verify Perly Pay webhooks

Any time code receives Perly Pay events.

1. **Make the endpoint** in Dashboard → Developers → Webhooks or with `webhookEndpoints.create({ url, enabled_events })`. The `whsec_…` secret is shown once: put it in `PERLY_PAY_WEBHOOK_SECRET`. Test and live endpoints have different secrets.
2. **Read the raw body** — the exact bytes. Disable the framework's JSON parser for this route only.
3. **Verify** with `pay.webhooks.verify(raw, header, secret)` (Node) or, in PHP, the `perly_pay_verify()` below (written out until perly/perly-pay is on Packagist). It checks the HMAC in constant time and refuses signatures older than five minutes. On failure answer **400** and do nothing.
4. **Do each event once:** keep the event `id` in a table with a unique index; skip ids you have. Deliveries are retried (for 72 hours) and may arrive twice or out of order.
5. **Act on the right event:** `invoice.fulfilled` to deliver (once per invoice, after screening); `entitlement.revoked` to take access back; `subscription.past_due`, `subscription.unpaid`, `subscription.ended` for renewals; `license.created` to send a key; `refund.confirmed` for your books. `event.data.object` is the object as it is now (an Invoice, a Subscription, …), with your `metadata`.
6. **Answer 2xx within a few seconds.** Queue slow work (emails, provisioning) after you stored the event. A non-2xx or a timeout is retried with backoff; an endpoint failing for long is switched off and the business is told.
7. **Test the handler** with `webhooks.testRequest(event, secret)` (signed body + headers) in unit tests, with "Send test event" in the dashboard, or end to end: a test-mode invoice plus `invoices.simulate`.

Code and pitfalls: https://pay.perly.io/docs/webhooks

### Test, then go live

Before anyone pays real money, and again on the day the integration switches to live.

**Test**

1. **Use a test key** (`sk_test_…`); `new PerlyPay(key).mode` is `"test"`. Fail fast in code if a test build ever sees `sk_live_` or production sees `sk_test_`.
2. **Run the happy path from code:** create the invoice your app creates (same function), then `invoices.simulate(id)` — the invoice turns paid and fulfilled, entitlements and license keys are issued, a receipt is made and your webhooks get the events.
3. **Assert the outcome your users care about:** the webhook route granted access, `entitlements.check` says `has_access`, the credit balance moved, the key activates.
4. **Run the unhappy paths:** `simulate(id, { outcome: "short" })` (underpaid: no access, the invoice waits), `{ outcome: "over" }` (paid, the extra to refund), an expired or canceled invoice, a webhook with a wrong signature (400), the same event twice (handled once). `short` and `over` need the buyer's chain chosen first: open `invoice.url` once, or simulate a `full` payment on a fresh invoice for the happy path.
5. **Webhooks while developing:** hosted Perly Pay needs a public https URL — a tunnel (`cloudflared tunnel --url http://localhost:3000`, ngrok) pointed at your route, registered as a test endpoint. In unit tests use `webhooks.testRequest(event, secret)`.
6. **Real test coins** (optional): pay a test invoice from a testnet wallet (Bitcoin testnet4; test USDC on Base Sepolia and other testnets). Never send mainnet money to a test invoice.
7. **Keep the test in CI** if it is fast: a test key in CI secrets, one simulated purchase per recipe.

**Go live**

1. **Wallets:** in Dashboard → Wallets connect the public keys (xpub/zpub from a Ledger or Trezor, or a pool of addresses) and confirm the first address on the device. Perly Pay never asks for a seed or a private key — anyone who does is not Perly Pay.
2. **Live key:** Dashboard → Developers → API keys, `sk_live_…`, into the production secret store as `PERLY_PAY_SECRET_KEY`. Never in the repo.
3. **Recreate what you made in test** with the live key: products, prices, payment links, coupons. Ids differ per mode, so update `PERLY_PAY_*_ID` in production config (a setup script run once per mode is easiest).
4. **Live webhook endpoint** with your production https URL and the same events; its new `whsec_…` into `PERLY_PAY_WEBHOOK_SECRET`.
5. **Business details:** name, support email, receipt prefix and refund terms in Settings — buyers see them on invoices and receipts. Add your site under Settings → Checkout if you open the checkout over your page (pay.js).
6. **Plan:** test mode is free and unlimited; live counts paid sales per calendar month (Free 21, then Starter, Pro, Business, Scale and Enterprise with no limit — flat, 0% of volume, no fee per sale). Each limit has a 10% buffer; past it, new live invoices and checkout sessions are refused with `plan_limit_reached` (403) until a person moves up a plan in the dashboard, while invoices already made still get paid.
7. **One real payment** of a small amount from your own wallet: watch it arrive, the webhook grant access, the receipt email, then refund it from your wallet to practise.
8. **Watch:** Dashboard → Developers shows webhook deliveries and failures; connect Telegram for payment and webhook alerts.

Code and pitfalls: https://pay.perly.io/docs/test-mode

<!-- END perly-pay -->
