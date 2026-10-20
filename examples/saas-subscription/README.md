# SaaS subscription (Next.js)

A Pro plan at $9 a month, paid in bitcoin, USDC or USDT with [Perly Pay](https://pay.perly.io). Each period is an invoice with reminders — **nothing is ever debited automatically**. The Pro page asks Perly Pay for access on every visit (`entitlements.check`); the webhook keeps the app's own record.

Recipe: <https://pay.perly.io/docs/recipe-saas-subscription> · Skill: `sell-subscription` in the Perly Pay plugin for Claude Code.

## Five steps

1. **Install.** `npm install` (Node 20.12+). Outside this repository, replace the `perly-pay` `file:` link in `package.json` with `npm install perly-pay` (and drop `.npmrc`).
2. **Key.** `cp .env.example .env.local` and put a **test** key (`sk_test_…`, Dashboard → Developers → API keys) in `PERLY_PAY_SECRET_KEY`.
3. **Make the plan.** `npm run setup` and paste the two ids it prints into `.env.local`.
4. **Run.** `npm run dev`, open <http://localhost:3000>, subscribe with your email. You land on the invoice.
5. **Pay without a wallet** (test mode): press **Simulate payment** on the invoice, then open <http://localhost:3000/pro?user=you@example.com> — Pro is unlocked until the period's end. Or from a shell: `curl -X POST localhost:3000/api/subscribe -H 'content-type: application/json' -d '{"email":"ada@example.com"}'`, simulate that invoice, `curl 'localhost:3000/api/access?user=ada@example.com'`.

## What to look at

- `lib/perly.ts` — customer by your user id, the first invoice (it opens the subscription), the access check, the customer portal.
- `app/pro/page.tsx` — the gate: Perly Pay decides, not the redirect.
- `app/api/webhooks/perly/route.ts` — signature on the raw body, each event once, `invoice.fulfilled` for the first payment and every renewal, `subscription.past_due` / `ended` for the rest. To receive them, expose the app (`cloudflared tunnel --url http://localhost:3000`) and run `PUBLIC_URL=https://… npm run setup`, which prints `PERLY_PAY_WEBHOOK_SECRET`.
- Renewals: before each period ends Perly Pay emails the buyer the next invoice and reminds them; **Manage or renew** on the Pro page opens the customer portal to pay it, prepay or cancel.

Going live: a live key, `npm run setup` again with it (ids differ per mode), a live webhook endpoint, your wallets connected in the dashboard.

MIT.
