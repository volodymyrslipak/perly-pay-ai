# Telegram bot (Node, no framework)

A bot with a paid `/secret` command. `/buy` sends each user **their own** invoice (bitcoin, USDC or USDT) from [Perly Pay](https://pay.perly.io); the signed webhook tells the bot when to say "confirmed", and every command asks Perly Pay who paid — a restart loses nothing.

Recipe: <https://pay.perly.io/docs/recipe-telegram-bot> · Skill: `sell-bot-access` in the Perly Pay plugin for Claude Code.

## Five steps

1. **Install.** `npm install` (Node 20.12+). Outside this repository, replace the `perly-pay` `file:` link in `package.json` with `npm install perly-pay`.
2. **Keys.** `cp .env.example .env`; a bot token from @BotFather in `TELEGRAM_BOT_TOKEN` and a **test** key (`sk_test_…`) in `PERLY_PAY_SECRET_KEY`.
3. **Make the product.** Expose the webhook listener (`cloudflared tunnel --url http://localhost:8788`) and run `PUBLIC_URL=https://… npm run setup`; paste the ids and `PERLY_PAY_WEBHOOK_SECRET` into `.env`. (Without a tunnel it still works: `/status` asks Perly Pay; you only miss the "confirmed" message.)
4. **Run.** `npm start`, then message the bot `/buy`.
5. **Pay without a wallet** (test mode): open the Pay button and press **Simulate payment**. The bot says "Payment confirmed"; `/secret` answers.

## What to look at

- `src/bot.ts` — a customer per Telegram user (`external_id: tg:<id>`), an invoice per `/buy` with the chat id in `metadata`, `entitlements.check` for every paid command, and the webhook listener verifying `Perly-Signature` on the raw bytes.
- A private group instead of a command: on `invoice.fulfilled`, `createChatInviteLink` with `member_limit: 1` and send it. Discord: the same flow, adding a role.

Going live: a live key, `npm run setup` again with it, a live webhook endpoint, your wallets connected in the dashboard.

MIT.
