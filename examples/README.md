# Perly Pay examples

Five small apps that sell something for bitcoin, USDC or USDT with [Perly Pay](https://pay.perly.io). Each runs in test mode with `PERLY_PAY_SECRET_KEY=sk_test_…` and has a README of five steps. MIT.

| Example | Sells | Built with | Recipe |
| --- | --- | --- | --- |
| [`api-credits`](api-credits) | Prepaid API credits, one per request | Hono | <https://pay.perly.io/docs/recipe-api-credits> |
| [`saas-subscription`](saas-subscription) | A monthly Pro plan, renewed by invoice | Next.js | <https://pay.perly.io/docs/recipe-saas-subscription> |
| [`license-keys`](license-keys) | An app unlocked by a license key | Node CLI | <https://pay.perly.io/docs/recipe-license-keys> |
| [`telegram-bot`](telegram-bot) | A paid bot command | Node, no framework | <https://pay.perly.io/docs/recipe-telegram-bot> |
| [`paid-mcp-server`](paid-mcp-server) | MCP tools, credits per call | MCP TypeScript SDK | <https://pay.perly.io/docs/recipe-paid-mcp-server> |

Every example follows the same rules: the secret key only on the server, access only from a verified `invoice.fulfilled` webhook or `entitlements.check` (never the redirect), idempotency keys on what may repeat, amounts in cents, and no auto-debit — renewals and top-ups are invoices the buyer pays.

Each example installs the SDK from npm (`perly-pay`). They are type-checked and bought through end to end in test mode in Perly Pay's own repository before each release.
