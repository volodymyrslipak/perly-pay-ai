---
name: verify-webhooks
description: Write or fix a Perly Pay webhook endpoint that verifies the Perly-Signature header on the raw body, handles each event once, and answers fast — for Next.js, Express, Hono, Fastify, Laravel and plain PHP. Use when the user adds a payment webhook, sees "signature mismatch" or "timestamp out of tolerance", gets duplicate deliveries, wants to know which Perly Pay events to listen to (invoice.fulfilled, subscription.*, license.created, entitlement.revoked, refund.confirmed), or needs to test a webhook handler.
license: MIT
metadata:
  author: Perly
  version: "0.1.1"
  docs: https://pay.perly.io/docs/webhooks
---

# Verify Perly Pay webhooks

## When to use

Any time code receives Perly Pay events. Every delivery is a POST whose body is the API's Event object (`{ id, type, object_type, object_id, data: { object, … }, livemode, created }`), signed with the endpoint's secret:

```
Perly-Signature: t=<unix seconds>,v1=<hex HMAC-SHA256(secret, t + "." + rawBody)>
```

## Steps

1. **Make the endpoint** in Dashboard → Developers → Webhooks or with `webhookEndpoints.create({ url, enabled_events })`. The `whsec_…` secret is shown once: put it in `PERLY_PAY_WEBHOOK_SECRET`. Test and live endpoints have different secrets.
2. **Read the raw body** — the exact bytes. Disable the framework's JSON parser for this route only.
3. **Verify** with `pay.webhooks.verify(raw, header, secret)` (Node) or, in PHP, the `perly_pay_verify()` below (written out until perly/perly-pay is on Packagist). It checks the HMAC in constant time and refuses signatures older than five minutes. On failure answer **400** and do nothing.
4. **Do each event once:** keep the event `id` in a table with a unique index; skip ids you have. Deliveries are retried (for 72 hours) and may arrive twice or out of order.
5. **Act on the right event:** `invoice.fulfilled` to deliver (once per invoice, after screening); `entitlement.revoked` to take access back; `subscription.past_due`, `subscription.unpaid`, `subscription.ended` for renewals; `license.created` to send a key; `refund.confirmed` for your books. `event.data.object` is the object as it is now (an Invoice, a Subscription, …), with your `metadata`.
6. **Answer 2xx within a few seconds.** Queue slow work (emails, provisioning) after you stored the event. A non-2xx or a timeout is retried with backoff; an endpoint failing for long is switched off and the business is told.
7. **Test the handler** with `webhooks.testRequest(event, secret)` (signed body + headers) in unit tests, with "Send test event" in the dashboard, or end to end: a test-mode invoice plus `invoices.simulate`.

## Code (Node, TypeScript)

```ts
// Next.js — app/api/webhooks/perly/route.ts
import { PerlyPay } from "perly-pay";
const pay = new PerlyPay(process.env.PERLY_PAY_SECRET_KEY!);

export async function POST(request: Request) {
  const raw = await request.text();
  let event;
  try {
    event = pay.webhooks.verify(raw, request.headers.get("perly-signature"), process.env.PERLY_PAY_WEBHOOK_SECRET!);
  } catch {
    return new Response("bad signature", { status: 400 });
  }
  if (!(await rememberEvent(event.id))) return new Response(null, { status: 204 }); // yours: false if already seen
  await handle(event); // switch on event.type
  return new Response(null, { status: 204 });
}
```

```ts
// Express — raw bytes on this route only, before express.json() touches it
app.post("/webhooks/perly", express.raw({ type: "application/json" }), async (req, res, next) => {
  let event;
  try {
    event = pay.webhooks.verify(req.body, req.header("Perly-Signature"), process.env.PERLY_PAY_WEBHOOK_SECRET!);
  } catch {
    return res.sendStatus(400);
  }
  try {
    await handle(event); // answer 2xx only once it is done: a failure answers 500 and Perly Pay retries
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});
```

```ts
// Hono
app.post("/webhooks/perly", async (c) => {
  let event;
  try {
    event = pay.webhooks.verify(await c.req.text(), c.req.header("perly-signature"), process.env.PERLY_PAY_WEBHOOK_SECRET!);
  } catch {
    return c.text("bad signature", 400);
  }
  await handle(event); // a throw answers 500, and Perly Pay retries
  return c.body(null, 204);
});
```

```ts
// Fastify — keep the raw string for this content type
fastify.addContentTypeParser("application/json", { parseAs: "string" }, (_req, body, done) => done(null, body));
fastify.post("/webhooks/perly", async (req, reply) => {
  const event = pay.webhooks.verify(req.body as string, req.headers["perly-signature"] as string, process.env.PERLY_PAY_WEBHOOK_SECRET!);
  await handle(event);
  return reply.code(204).send();
});
```

```ts
// A unit test for the handler — no network
import { webhooks } from "perly-pay";
const { body, headers } = webhooks.testRequest({ id: "evt_1", type: "invoice.fulfilled", data: { object: { id: "inv_1", metadata: { user_id: "u1" } } } }, "whsec_test");
const response = await POST(new Request("http://localhost/api/webhooks/perly", { method: "POST", body, headers }));
// expect 204, and that u1 got access
```

## Code (PHP)

```php
// perly/perly-pay is not on Packagist yet: the check written out, as its Webhook::verify does it.
function perly_pay_verify(string $payload, ?string $header, string $secret, int $tolerance = 300): ?array
{
    $timestamp = null;
    $signatures = [];
    foreach (explode(',', (string) $header) as $part) {
        [$key, $value] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($key === 't' && preg_match('/^\d{1,12}$/', $value) === 1) $timestamp = (int) $value;
        if ($key === 'v1' && preg_match('/^[0-9a-fA-F]{64}$/', $value) === 1) $signatures[] = strtolower($value);
    }
    if ($timestamp === null || abs(time() - $timestamp) > $tolerance) return null;
    $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
    foreach ($signatures as $signature) {
        if (hash_equals($expected, $signature)) {
            $event = json_decode($payload, true);
            return is_array($event) ? $event : null;
        }
    }
    return null;
}

$event = perly_pay_verify(file_get_contents('php://input'), $_SERVER['HTTP_PERLY_SIGNATURE'] ?? null, (string) getenv('PERLY_PAY_WEBHOOK_SECRET'));
if ($event === null) {
    http_response_code(400);
    exit;
}
if ($event['type'] === 'invoice.fulfilled') {
    grant_access($event['data']['object']['metadata']['user_id']);
}
http_response_code(204);
```

Laravel: read `$request->getContent()` (not `$request->all()`), take the header from `$request->header('Perly-Signature')`, and exclude the route from CSRF (`VerifyCsrfToken::$except` or `->withoutMiddleware`).

## Pitfalls

- `signature_mismatch` almost always means the body was parsed and re-serialised, or a proxy changed it. Verify the raw bytes.
- `timestamp_out_of_tolerance`: the server clock is off by more than five minutes, or you are replaying an old delivery. Fix the clock (NTP); do not widen the tolerance.
- The wrong secret: test and live endpoints differ, and rolling a secret stops the old one at once.
- Doing work twice on a retried delivery. Dedupe by event `id`.
- Answering 2xx before the work is done (`void handle(event)`, then 204): if it then fails, nothing retries it and a paid buyer gets nothing. Await it; a failure answers 5xx.
- Trusting `event.data.object` from an unverified request, or reading the event type from a query string. Verify first; when in doubt, re-read the object with the API (`invoices.retrieve`).
- A webhook URL on `localhost` with hosted Perly Pay: it must be public https (use a tunnel while developing). A local Perly Pay may call `http://localhost` in test mode.

<!-- perly-pay:ground-rules:start -->
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
<!-- perly-pay:ground-rules:end -->

## More

- Webhooks and every event type: https://pay.perly.io/docs/webhooks
