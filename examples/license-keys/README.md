# License keys (Node CLI)

A command-line app with a paid feature, unlocked by a license key bought for bitcoin, USDC or USDT with [Perly Pay](https://pay.perly.io). The app talks to the public license endpoints only (`LicenseClient`): **no secret key ships in it**. Three devices per key, a week of offline grace.

Recipe: <https://pay.perly.io/docs/recipe-license-keys> · Skill: `sell-license-keys` in the Perly Pay plugin for Claude Code.

## Five steps

1. **Install.** `npm install` (Node 20.12+). Outside this repository, replace the `perly-pay` `file:` link in `package.json` with `npm install perly-pay`.
2. **Key (seller side).** `cp .env.example .env` and put a **test** key (`sk_test_…`, Dashboard → Developers → API keys) in `PERLY_PAY_SECRET_KEY`. Only `scripts/` reads it.
3. **Make the product.** `npm run setup`: a product that issues keys, a $19 price and a payment link. Paste `PERLY_PAY_PRODUCT_ID` into `.env`.
4. **Buy a copy without a wallet.** `npm run buy-test -- you@example.com` makes an invoice, simulates the payment and prints the key. (Or open the payment link, press **Simulate payment**, and find the key in Dashboard → Licenses.)
5. **Use it.** `npm run app -- pro hello` (refused) → `npm run app -- activate <key>` → `npm run app -- pro hello` (works) → `npm run app -- deactivate` to free the seat.

## What to look at

- `src/license.ts` — activate with a stable `instance_name`, validate with the activation id and the product, offline grace, deactivate.
- `scripts/` — the seller's side with the secret key. In production you send each buyer their key yourself: on the `license.created` webhook, or `licenseKeys.list({ customer })` after `invoice.fulfilled`.

Going live: a live key, `npm run setup` again with it, ship the live product id in the app.

MIT.
