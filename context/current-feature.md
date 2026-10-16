# Current Feature: Paystack Gating — Phase 1 (Entitlements Core)

## Status

In Progress

## Goals

- Move `PRO_TYPE_NAMES` from `src/lib/db/item-types.ts` to `src/lib/system-types.ts` (exported, import-free); no behaviour change, sidebar Pro badge still works
- New pure `src/lib/entitlements.ts`: `FREE_LIMITS` (50 items / 3 collections), private 24 h `EXPIRY_GRACE_MS`, `isBillingEnforced()` (literal `"true"` only), `PlanUsage` / `ProAccessFields`, `hasProAccess()`, `Denial` + `DENIAL_MESSAGES` built from `FREE_LIMITS`, `checkItemCreate` / `checkCollectionCreate` / `checkProFeature`
- `hasProAccess`: `non-renewing` **and** `attention` expire past `currentPeriodEnd` + 24 h; `active`, pending and null period end stay Pro; `isPro: false` is never Pro
- Checks allow everything when enforcement is off or the user has Pro access; counts are pre-create (49 → allowed, 50 → `ITEM_LIMIT`); File/Image → `PRO_TYPE` regardless of count
- New `src/lib/db/entitlements.ts`: `getPlanUsage(userId)` — one `findUnique` with `select` + `_count`, flattened; `null` for a stale session
- `billingState()` takes `currentPeriodEnd` + optional `now`: expired `non-renewing` → `"free"`; `attention` stays `"attention"` even when expired (checked before `hasProAccess`)
- `startCheckout()`: refuse while `hasProAccess`, refuse while status is `active` or `attention` (expired attention gets a "update your card under Manage subscription" message), allow expired `non-renewing`
- `.env.example`: `BILLING_ENFORCED="false"` with comment, next to `SKIP_EMAIL_VERIFICATION`
- Tests: new `src/lib/entitlements.test.ts`, `src/lib/db/entitlements.test.ts`; extend `src/lib/billing.test.ts` and `src/actions/billing.test.ts`; existing billing suites stay green

## Notes

- Spec: `context/features/paystack-gating-phase-1-spec.md`; source is Part 2 of `docs/paystack-integration-plan.md`. Checkout/callback/webhook/settings billing already shipped in `93d4312`
- Decisions (Björn, 2026-10-16): 24 h grace; `attention` expires too; settings keeps showing the attention state for expired `attention`, and `startCheckout` keeps refusing (Paystack may still retry → double-charge risk)
- With `BILLING_ENFORCED` off (default), the only behaviour change is that an expired `non-renewing` subscription shows as Free and can subscribe again. Nothing calls `check*` until Phase 2
- Pure logic (`entitlements.ts`, `system-types.ts`, `billing.ts`) must not import Prisma
- Leave `isLiveSubscriptionStatus` alone even if it loses its callers — the account-deletion fix uses it
- Tests: `vi.stubEnv` / `vi.unstubAllEnvs` for `BILLING_ENFORCED`; pass `now` explicitly rather than faking timers; no DB, no network
- Manual testing on the **development** branch only (Prisma Studio): expired `non-renewing` → Free + upgrade → checkout opens; 12 h past → still "Pro until …"; expired `attention` → failed-payment warning, no upgrade
- Out of scope: server gates, UI (locked types, upgrade toasts, usage line), docs, Vercel deploy (all Phase 2); account deletion cancelling the subscription (own `fix/` branch); plan switching, dunning, cron reconciliation, live keys

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
