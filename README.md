# Perly Pay for AI coding assistants

Sell your service for crypto in one prompt. These skills teach Claude Code, Cursor and any agent that reads `AGENTS.md` how to add [Perly Pay](https://pay.perly.io) to a project the right way: test mode first, signed webhooks, access only on `invoice.fulfilled`, idempotent credit spending, subscriptions renewed by invoice (never auto-debit).

Buyers pay bitcoin, USDC or USDT straight to your wallet. 2.5¢ a payment, nothing taken from it, and a month of up to 21 payments is free. Everything here is files you install: the skills call Perly Pay's public API with **your own** key, and nothing runs on anyone's server.

| Skill | Use it to |
| --- | --- |
| `add-crypto-checkout` | Take a payment in any web app: product, price, invoice or payment link, webhook, go-live |
| `sell-credits` | Prepaid credits for an API or AI feature, spent per request |
| `sell-subscription` | Monthly or yearly plans, renewed by invoice + reminders, gated by an entitlement check |
| `sell-license-keys` | Desktop apps, CLIs, plugins: keys issued on payment, activated and validated without a secret |
| `sell-bot-access` | Paid Telegram or Discord bots, roles and private groups |
| `paid-mcp-tools` | Charge per MCP tool call with credits |
| `verify-webhooks` | A correct webhook route in Next.js, Express, Hono, Fastify, Laravel or plain PHP |
| `test-and-go-live` | Simulated payments in test mode, then the live checklist |

Node projects use the SDK (`npm install perly-pay`). PHP's SDK, `perly/perly-pay`, is not on Packagist yet, so until it is the skills' PHP calls the REST API with Guzzle, Laravel's `Http` or WordPress's `wp_remote_post`, and checks webhook signatures with a short function written out in `verify-webhooks`. Nothing in them asks for a package that cannot be installed.

## Claude Code

```bash
claude plugin marketplace add volodymyrslipak/perly-pay-ai && claude plugin install perly-pay@perly
```

Inside a session the same is `/plugin marketplace add volodymyrslipak/perly-pay-ai`, then `/plugin install perly-pay@perly`. From a clone of this repository: `claude plugin marketplace add ./perly-pay-ai`. To try it without installing: `claude --plugin-dir ./perly-pay-ai`.

Then ask in plain words — "let people buy API credits with crypto", "add a Pro plan paid in USDC" — and Claude picks the skill. Or call one: `/perly-pay:sell-credits`.

You need a test key (`sk_test_…`) from Dashboard → Developers → API keys at <https://pay.perly.io>. Keep it in `PERLY_PAY_SECRET_KEY`; the skills never ask you to paste it into code.

## Cursor

Copy the rules into your project:

```bash
git clone --depth 1 https://github.com/volodymyrslipak/perly-pay-ai /tmp/perly-pay-ai
mkdir -p .cursor/rules && cp /tmp/perly-pay-ai/cursor/rules/*.mdc .cursor/rules/
```

`perly-pay.mdc` holds the ground rules and the list of recipes; each `perly-pay-<skill>.mdc` holds one recipe. All are "Apply Intelligently": Cursor attaches them when a chat is about payments.

## AGENTS.md (Codex, Jules, Copilot, Zed, Cursor and others)

Paste [`AGENTS-snippet.md`](AGENTS-snippet.md) into your project's `AGENTS.md` — the block between `BEGIN perly-pay` and `END perly-pay`, so you can replace it on the next update.

## Other agents that read skills

The folders in `skills/` follow the open Agent Skills format (`SKILL.md` with `name` and `description`). Copy them wherever your agent loads skills from, for example `~/.claude/skills/` or `.claude/skills/` for Claude Code without the plugin.

## Runnable examples

Five small open-source apps, each runs in test mode with `PERLY_PAY_SECRET_KEY`: `examples/api-credits` (Hono), `examples/saas-subscription` (Next.js), `examples/license-keys` (Node CLI), `examples/telegram-bot` (Node), `examples/paid-mcp-server` (MCP). Recipes: <https://pay.perly.io/docs/recipes>.

## Where this is made

The skills, rules and examples are made and tested in Perly Pay's own repository and copied here on each release. The Cursor rules and `AGENTS-snippet.md` are generated from `skills/`, so a fix belongs in the skill. Issues and pull requests are welcome here.

## Formats used

Written against these, as of October 2026:

- Claude Code plugin manifest and layout (`.claude-plugin/plugin.json`, `skills/<name>/SKILL.md`): <https://code.claude.com/docs/en/plugins-reference>
- Claude Code marketplaces (`.claude-plugin/marketplace.json`, `claude plugin marketplace add`, `claude plugin install <plugin>@<marketplace>`, `claude plugin validate`): <https://code.claude.com/docs/en/plugin-marketplaces>
- Skills in Claude Code (frontmatter, 500-line guidance): <https://code.claude.com/docs/en/skills>
- Agent Skills specification (`name` ≤ 64 lowercase letters, digits and single hyphens, matching the folder; `description` ≤ 1024 characters; the six portable fields): <https://agentskills.io/specification>
- Cursor project rules (`.cursor/rules/*.mdc`, `description` / `globs` / `alwaysApply`, under 500 lines, AGENTS.md support): <https://cursor.com/docs/context/rules>
- AGENTS.md: <https://agents.md>

## License

MIT. The skills and examples are open source; the Perly Pay service they talk to is not.
