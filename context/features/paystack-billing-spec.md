# Paystack Billing (Pro Subscriptions)

## Overview

Wire up Pro subscriptions with **Paystack**, replacing the Stripe plan in the
original spec — Stripe isn't available in South Africa.

A South African Paystack account can only charge in **ZAR** (USD is limited to
Nigeria/Kenya merchants — https://support.paystack.com/en/articles/2130690), so
**rand is the source of truth for billing**. The pricing UI shows an
approximate USD figure converted daily, with the rand amount stated beside it.

| Plan | Charged | Paystack interval | Displayed as |
|---|---|---|---|
| Pro Monthly | **R135** | `monthly` | `≈ $X.XX / month · billed as R135` |
| Pro Yearly | **R1,200** | `annually` | `≈ $X.XX / year · billed as R1,200` |

R1,200 vs 12 × R135 = R1,620 is a 25.9% saving, so the "Save 25%" badge stays.

> 🚧 Per the project overview, Pro **gating stays bypassed** during development.
> This feature makes a user *become* Pro (`isPro`) — it does not enforce limits.

## Requirements

### 1. Environment

Replace the Stripe block in `.env.example`:

```
PAYSTACK_SECRET_KEY=""          # sk_test_… — API calls AND webhook signature verification
PAYSTACK_PLAN_CODE_MONTHLY=""   # PLN_…
PAYSTACK_PLAN_CODE_YEARLY=""    # PLN_…
```

- No webhook secret — Paystack signs webhooks with the secret key.
- No public key — we use redirect checkout, not the inline popup.

### 2. Pricing constants — `src/lib/billing.ts`

- `PRO_PLANS` constant keyed by `"monthly" | "yearly"`: rand amount, period
  label, and the env var holding its plan code.
- Paystack amounts are in the subunit (cents): R135 → `13500`, R1,200 → `120000`.
- Single place the prices live — `PricingToggle.tsx`'s hard-coded `$8` / `$72`
  move here.

### 3. Exchange rate — `src/lib/exchange-rate.ts`

- `getZarToUsdRate(): Promise<number | null>`
- Source: `https://api.frankfurter.dev/v1/latest?from=ZAR&to=USD` (ECB reference
  rates, free, no key, updated working days). Use the `.dev/v1` URL — `.app`
  301-redirects there.
- `fetch` with `next: { revalidate: 86400 }` (≈ one upstream call per day) and
  `AbortSignal.timeout(3000)`.
- Validate the response with Zod (`rates.USD` a positive number).
- **Fails soft:** any error, timeout or bad shape → `null`, logged once.
- `zarToUsd(zar, rate)` + formatting via `Intl.NumberFormat` (USD, 2 decimals).

### 4. Pricing display

- `PricingSection` (server) awaits the rate and passes it into the client
  `PricingToggle` / `ProPrice` as a `usdRate: number | null` prop.
- With a rate: big figure `≈ $8.07`, period `/ month`, note
  `Billed as R135 monthly. Cancel anytime.` (yearly: `Billed as R1,200 yearly — about R100 a month.`)
- Without a rate: big figure is the rand price (`R135`), no USD anywhere.
- Free tier stays `$0` (true in any currency).
- Settings billing section reuses the same price component/logic.

### 5. Schema migration

Via `npm run db:migrate` on the **development** branch only. On `User`:

| Old | New |
|---|---|
| `stripeCustomerId String? @unique` | `paystackCustomerCode String? @unique` (`CUS_…`) |
| `stripeSubscriptionId String? @unique` | `paystackSubscriptionCode String? @unique` (`SUB_…`) |
| — | `paystackEmailToken String?` (needed to disable a subscription) |
| — | `subscriptionStatus String?` (Paystack status: `active`, `non-renewing`, `attention`, `completed`, `cancelled`) |
| — | `currentPeriodEnd DateTime?` (next payment / access-until date) |

Prisma will generate the renames as drop + add. That is fine **only because
the Stripe columns are unused** — confirm they're empty on dev before applying,
and review the generated SQL.

### 6. Paystack client — `src/lib/paystack.ts`

Thin `fetch` wrapper over `https://api.paystack.co` with
`Authorization: Bearer ${PAYSTACK_SECRET_KEY}`, Zod-parsed responses, and
throws on `status: false`. Only the calls we use:

- `initializeTransaction({ email, amount, plan, callback_url, metadata })`
- `verifyTransaction(reference)`
- `listSubscriptions({ customer })` / `fetchSubscription(code)`
- `getManageLink(subscriptionCode)`
- `verifyWebhookSignature(rawBody, signature)` — HMAC-SHA512 with the secret
  key, compared with `crypto.timingSafeEqual`

### 7. Checkout — server action `startCheckout(billing)` in `src/actions/billing.ts`

1. Require a session; Zod-validate `billing`.
2. Refuse if the user already has an `active` / `non-renewing` subscription.
3. `initializeTransaction` with the user's email, the plan code, `metadata.userId`,
   and `callback_url = ${APP_URL}/api/billing/callback`.
4. Return `{ success, data: { authorizationUrl } }`; the client redirects.

### 8. Callback — `GET /api/billing/callback?reference=…`

The user lands here after paying. Don't trust the query string:

1. Require a session.
2. `verifyTransaction(reference)` server-side; require `status === "success"`
   and `metadata.userId === session user`.
3. Save `paystackCustomerCode`, set `isPro = true`.
4. Look up the subscription via `listSubscriptions({ customer })` and store
   code, email token, status and next payment date. **This makes local dev
   work without a webhook tunnel.**
5. Redirect to `/settings?billing=success` (or `?billing=failed`) → toast.

### 9. Webhook — `POST /api/webhooks/paystack`

- Read the **raw** body (`request.text()`), verify `x-paystack-signature`
  before parsing; bad/missing signature → `401`.
- Handlers are **idempotent** (Paystack retries; callback and webhook overlap).
- Match users by `paystackCustomerCode`, falling back to `metadata.userId`
  on `charge.success`.

| Event | Effect |
|---|---|
| `charge.success` | `isPro = true`; save customer code |
| `subscription.create` | save subscription code, email token, status, next payment date |
| `invoice.update` / `charge.success` on renewal | refresh `currentPeriodEnd`, status `active` |
| `invoice.payment_failed` | status `attention` (Pro kept for now — no dunning in scope) |
| `subscription.not_renew` | status `non-renewing` — **still Pro** until `currentPeriodEnd` |
| `subscription.disable` | `isPro = false`, status `cancelled`/`completed` |
| anything else | `200`, ignored |

- Return `200` quickly for every verified event, including ignored ones.
- `/api/*` isn't in the proxy matcher, so the route is public by design; the
  signature is the auth. No rate limit.

### 10. Settings → Billing section

On `/settings` (new `src/components/settings/BillingSection.tsx`):

- **Free:** both prices (same display as homepage) + "Upgrade monthly" /
  "Upgrade yearly" buttons → `startCheckout`.
- **Pro:** plan, status, "Renews on …" / "Pro until …" (non-renewing), and a
  "Manage subscription" button → server action that fetches the Paystack
  hosted manage link and redirects (card update + cancel live there).
- **Attention:** warning that the last payment failed + manage button.
- Handles `?billing=success|failed` with a toast.

### 11. Homepage CTA

"Go Pro" links to `/settings#billing` instead of `/register`; the proxy sends
signed-out visitors through sign-in and back. Remove the "until Stripe
checkout exists" comment.

### 12. Docs

- `project-overview.md`: Stripe → Paystack throughout; pricing table to
  R135 / R1,200 with the "USD shown approximately" note.
- `coding-standards.md`: "Webhooks (Stripe, GitHub, etc.)" → Paystack.

## Tests

Colocated, all network mocked (`fetch`, `@/lib/prisma`, `@/auth`):

- `exchange-rate.test.ts` — happy path, non-200, bad shape, timeout → `null`; conversion/rounding.
- `paystack.test.ts` — signature: valid, tampered body, wrong length, missing header.
- `billing.test.ts` (action) — unauthenticated, invalid billing, already subscribed, happy path.
- `api/billing/callback/route.test.ts` — failed verification, **metadata.userId mismatch**, success.
- `api/webhooks/paystack/route.test.ts` — 401 on bad signature, each mapped event, unknown event → 200, replayed event is a no-op.

## Sandbox setup (Björn)

1. Paystack dashboard → **Test mode** → Settings → API Keys & Webhooks → copy `sk_test_…` into `.env`.
2. Create two plans (dashboard, or via the Paystack MCP): **Pro Monthly** R135 `monthly`,
   **Pro Yearly** R1,200 `annually` → plan codes into `.env`.
   - Optional: a throwaway **hourly** test plan to watch renewal webhooks fire without waiting a month.
3. Webhooks: localhost can't receive them. Run a tunnel (`cloudflared tunnel --url http://localhost:3000`
   or ngrok) and set the **test** webhook URL to `https://<tunnel>/api/webhooks/paystack`.
   The callback route covers the basic flow without this.
4. Pay with Paystack's test cards (see Paystack docs → Test Payments).
5. Optional — the official Paystack MCP (`@paystack/mcp-server`, public preview, **rejects live keys**).
   Run in your own terminal so the key stays out of the transcript (local scope, not `.mcp.json`):
   `claude mcp add paystack -e PAYSTACK_TEST_SECRET_KEY=sk_test_xxx -- npx -y @paystack/mcp-server`

## Out of scope

- Enforcing Free-tier limits / gating Pro features (separate feature, after launch prep).
- Switching between monthly and yearly (Paystack has no plan swap — cancel + resubscribe).
- Failed-payment emails / dunning, invoice history, refunds.
- Live keys and production webhook URL — a deploy-time step, done explicitly.

## References

- Subscriptions: https://paystack.com/docs/payments/subscriptions/
- Webhooks: https://paystack.com/docs/payments/webhooks/
- MCP server (test keys only): https://paystack.com/docs/developer-tools/mcp-server/
- Currencies by country: https://support.paystack.com/en/articles/2130690
- Exchange rates: https://frankfurter.dev
