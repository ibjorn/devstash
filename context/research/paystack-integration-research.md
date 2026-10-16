# Paystack Integration Research

## Output

`docs/paystack-integration-plan.md`

## Research

Analyze the codebase to create a comprehensive Paystack subscription integration plan for DevStash Pro (**R135/month**, **R1,200/year**, charged in ZAR; the pricing UI shows an approximate USD figure).

DevStash is a demo, not a product. It's deployed on Vercel but never goes live, so Paystack stays in **test mode** everywhere. Don't plan live keys, account activation, legal pages or tax.

Core billing already shipped in `93d4312` (*feat: Paystack Pro subscriptions billed in ZAR*): checkout, the verified callback, the signed webhook and the settings billing section. Record what exists, then plan what's left.

## Include

### Current State Analysis

- User model schema: `isPro`, `paystackCustomerCode`, `paystackSubscriptionCode`, `paystackEmailToken`, `subscriptionStatus`, `currentPeriodEnd`
- NextAuth configuration and session handling (JWT strategy, edge-safe `auth.config.ts` vs `auth.ts`)
- How user data is accessed in server actions, route handlers and server components
- Existing billing code: `src/lib/paystack.ts`, `src/lib/billing.ts`, `src/lib/db/billing.ts`, `src/lib/subscription-sync.ts`, `src/actions/billing.ts`, the callback route, the webhook route, `BillingSection`
- The webhook event map and how idempotency is achieved

### Feature Gating Analysis

- Free tier limits from the project spec (50 items, 3 collections, no File / Image)
- Where item/collection counts are checked or could be checked (`createItem`, `createCollection`, the upload route)
- Pro-only features: file uploads, AI, custom types, export. Note which ones exist yet
- How gating stays bypassed by default, and how it can be switched on to demo the Free-tier limits
- What a user who downgrades keeps: existing items, collections and files, and which actions stay allowed on them
- Count-then-create race at the limit, and whether it matters
- Settings page structure and where usage / upgrade prompts belong

### Open Issues to Cover

- **Account deletion with a live subscription**: today the Paystack subscription survives the deleted user and keeps charging. What should happen to it, and what if cancelling it fails?
- **A missed `subscription.disable` webhook**: what happens to a non-renewing user whose `currentPeriodEnd` has passed if the event never arrives, and how should the app handle it?
- **Plan switching**: Paystack has no plan swap, and `startCheckout` refuses while non-renewing. How does a subscriber move between monthly and yearly, and what does the UI need to tell them?
- **Failed renewals (`attention`)**: Pro is kept while Paystack retries, with no dunning. Decide whether that stays
- **"Basic vs Full" search** is in the pricing table but undefined: define it or drop it
- **Gating hooks for unbuilt Pro features** (AI, export, custom types)
- **Vercel demo deployment (test mode)**: what the deployed demo needs for billing to work: prod migration (explicit only), env vars, `APP_URL`, and the webhook URL. How local dev and Vercel share one Paystack test account, and what that means for webhooks

### Production Reference (for the follow-on real project, not DevStash)

The next project integrates Paystack for real, with **inventory, client invoicing and recurring billing**. Cover what production needs beyond the demo, in a clearly separate section, marking each Paystack claim as verified (against the docs) or unverified:

- Environments and keys: test vs live, webhook URLs per environment, key rotation
- Business and legal prerequisites: activation, legal pages, POPIA, international cards, VAT and tax invoices, fees
- Subscription lifecycle gaps: deletion, price changes on existing subscribers, plan switching, dunning, expiring cards, refunds, disputes, customer email changes
- Reliability: reconciliation, webhook event logging, monitoring
- A go-live runbook
- Which Paystack tool fits which payment shape (fixed subscriptions, variable recurring charges, invoices / payment requests, one-off links, direct debit)
- Webhook routing when one app takes several kinds of payment
- Who owns the ledger (invoices, numbering, credit notes, partial payments) and how payments interact with inventory

### API & Webhook Patterns

- How API routes are structured and authenticate themselves (`/api/*` is outside the proxy matcher)
- Server action error handling (`{ success, data, error, fieldErrors }`)
- Environment variable patterns (literal `"true"` flags, as with `SKIP_EMAIL_VERIFICATION`)
- Paystack webhook delivery rules: signature, retries, timeouts

## Deliverable

A complete implementation plan with:

1. Files to create (with code examples)
2. Files to modify (with specific changes)
3. Paystack test-mode setup (done locally) and the Vercel demo deployment steps
4. Testing checklist (unit + manual, enforcement on and off)
5. Implementation order

## Sources

- @context/project-overview.md
- @context/features/paystack-billing-spec.md
- @prisma/schema.prisma
- `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`
- `src/actions/`, `src/app/api/`, `src/lib/`, `src/lib/db/`
- Paystack API docs via Context7 (`/websites/paystack`), since paystack.com blocks direct fetches

## Notes

**Do not put `isPro` in the JWT.** A common NextAuth pattern (the Stripe version of this prompt suggested it) re-reads `isPro` from the database in the `jwt` callback so webhook changes reach the session. That doesn't apply here, for two reasons:

- `isPro` was never in the session. Every check reads it from the database, so a webhook's change takes effect on the next request.
- Callbacks live in the edge-safe `auth.config.ts`, which the proxy also runs. A Prisma query there would run in the edge runtime, where the Prisma adapter can't run.

Gates belong in server actions and route handlers, reading the plan from the database in the same query that loads the counts. If a client component needs the plan, pass it as a prop from the server component.
