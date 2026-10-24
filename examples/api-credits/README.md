# API credits (Hono)

An API that sells prepaid credits for bitcoin, USDC or USDT with [Perly Pay](https://pay.perly.io) and spends one per request. A short balance answers `402` with a top-up link. Perly Pay is the ledger: no database here.

Recipe: <https://pay.perly.io/docs/recipe-api-credits> · Skill: `sell-credits` in the Perly Pay plugin for Claude Code.

## Five steps

1. **Install.** `npm install` (Node 20.12+). Outside this repository, replace the `perly-pay` `file:` link in `package.json` with `npm install perly-pay`.
2. **Key.** `cp .env.example .env` and put a **test** key (`sk_test_…`, Dashboard → Developers → API keys) in `PERLY_PAY_SECRET_KEY`.
3. **Make the credit pack.** `npm run setup` and paste the two ids it prints into `.env`.
4. **Run.** `npm start`, then:

   ```bash
   curl -X POST localhost:8787/v1/shout -H "Authorization: Bearer demo-ada" -d '{"text":"hi"}'   # 402 + top_up link
   curl -X POST localhost:8787/top-up -H "Authorization: Bearer demo-ada"                         # { url }: ada's own top-up page
   ```

5. **Pay without a wallet** (test mode): open the `url`, pick the pack, and press **Simulate payment** on the invoice. Call `/v1/shout` again: `200`, and `X-Credits-Remaining: 499`.

## What to look at

- `src/perly.ts` — find-or-create the customer by your user id, the buyer's own top-up page (`credits.topUpUrl`), the balance (`credits.balance`), and `spend()`: `credits.consume` with an idempotency key, with `insufficient_credits` treated as "top up". A retry with the same key returns the first spend, even days later, so the key is made on the server for each request, never taken from the caller.
- `src/server.ts` — spend before work, `402` with the link, and a webhook route that verifies `Perly-Signature` on the raw body.
- Webhooks are optional here (the balance is read from Perly Pay). To get "credits added", expose the server (`cloudflared tunnel --url http://localhost:8787`) and run `PUBLIC_URL=https://… npm run setup`, which also prints `PERLY_PAY_WEBHOOK_SECRET`.

Going live: a live key, `npm run setup` again with it (ids differ per mode), your wallets connected in the dashboard.

MIT.
