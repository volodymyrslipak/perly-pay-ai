# Paid MCP server (credits per tool call)

An MCP server whose tools cost credits. A person buys a credit pack once with bitcoin, USDC or USDT through [Perly Pay](https://pay.perly.io); every call checks the balance, spends with an idempotency key, then runs. Out of credits, a tool answers with a top-up link the agent shows to the person. No x402, no wallet in the agent, nothing debited on its own.

Recipe: <https://pay.perly.io/docs/recipe-paid-mcp-server> · Skill: `paid-mcp-tools` in the Perly Pay plugin for Claude Code.

## Five steps

1. **Install.** `npm install` (Node 20.12+). Outside this repository, replace the `perly-pay` `file:` link in `package.json` with `npm install perly-pay`.
2. **Key.** `cp .env.example .env` and put a **test** key (`sk_test_…`) in `PERLY_PAY_SECRET_KEY`.
3. **Make the credit pack.** `npm run setup`; paste the two ids into `.env`.
4. **Connect a client.** Claude Code: `claude mcp add paid-tools -- npx tsx "$PWD/src/server.ts"`. Ask it to run `word_stats` on any text: it answers "Out of credits … top up here".
5. **Pay without a wallet** (test mode): open the link, pick the pack, and press **Simulate payment** on the invoice. Run the tool again — it works, and `balance` shows 99.

## What to look at

- `src/credits.ts` — `charge()`: `credits.consume` with the tool's name as the action and a key made of this session's id and the JSON-RPC request id, `insufficient_credits` as a normal answer; `credits.topUpUrl` for the person's own top-up page.
- `src/server.ts` — paid tools charge before working and return `isError: true` with the link instead of a protocol error; `balance` and `top_up` are free.
- This demo calls Perly Pay itself, so it runs where your secret key lives. To let other people use your tools, host it (Streamable HTTP) with an API key per user mapped to `MCP_USER_ID`, or have it call your backend — never hand out the key.

Going live: a live key, `npm run setup` again with it, your wallets connected in the dashboard.

MIT.
