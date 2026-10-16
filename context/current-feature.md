# Current Feature: Paystack Gating — Phase 2 (Gates, UI & Vercel Demo)

## Status

In Progress

## Goals

- `createItem` gates on `getPlanUsage()` + `checkItemCreate()` after the type resolves, before file checks; denials return `DENIAL_MESSAGES[...]` with `upgrade: true` (added to `ItemActionResult`). `null` plan → signed-in error
- `createCollection` gates via `checkCollectionCreate()` after Zod validation; `upgrade?: true` on `CollectionActionResult`
- `POST /api/items/upload` returns `403` + `PRO_TYPE` + `upgrade: true` for non-Pro users, after `uploadKindFor` and **before** `checkRateLimit` (no presigned URL, no spent budget)
- `CreatableItemType.locked`: `AppShell` sets it from `getPlanUsage()` (`getCreatableItemTypes()` stays plan-agnostic); `NewItemDialog` shows locked types with a **Pro** badge, an upgrade note/link to `/settings#billing`, and disables submit
- Denial toasts (`NewItemDialog`, `NewCollectionDialog`, `upload-client.ts` path) get an **Upgrade** action → `/settings#billing` when `upgrade` is set
- `BillingSection` receives `stats.items` / `stats.collections`, `isBillingEnforced()` and a `paused` prop:
  - Free + enforced → `n / 50 items · n / 3 collections` from `FREE_LIMITS`; no usage line when not enforced
  - Non-renewing → "To switch between monthly and yearly, resubscribe after {periodEnd}." (copy only)
  - Attention past period end + 24 h + enforced → "Pro features are paused until the payment goes through."
  - Client components never read `process.env`
- `context/project-overview.md` 🚧 note rewritten for `BILLING_ENFORCED`
- Tests extended: `src/actions/items.test.ts`, `src/actions/collections.test.ts`, `src/app/api/items/upload/route.test.ts` (cases per spec)
- `npm run lint`, `npm test`, `npm run build` pass

## Notes

- Spec: `context/features/paystack-gating-phase-2-spec.md`; source: Part 2 of `docs/paystack-integration-plan.md`. Builds on Phase 1 (`src/lib/entitlements.ts`, `@/lib/db/entitlements`)
- **Everything behind `BILLING_ENFORCED`** — unset means gates run and allow; demo behaves as today. Test mode only, never live keys
- Principles: server is the gate (UI lock is courtesy); one `getPlanUsage` query per gate; downgrade keeps data (only new creation blocked); count-then-create race accepted for a soft limit
- **No migration in this phase**
- **§8 Vercel demo deployment is Björn's, step by step.** Claude may prepare commands/checks but runs nothing against production. The prod `db:deploy` (pending `20261015120000_paystack_billing`) only on Björn's explicit say-so, restated and confirmed first
- Webhooks: Paystack test mode likely holds one webhook URL — Vercel by default; local testing via `cloudflared` quick tunnel, then set it back
- Tests mock `@/lib/db/entitlements`, `@/lib/prisma`, `@/auth`, `@/lib/db/session-user`, `@/lib/rate-limit`; toggle the flag with `vi.stubEnv`
- Manual UI checks are Björn's in Windows Chrome; no build while the dev server runs
- Out of scope: account-deletion cancelling subs, plan-switch logic, gating AI/export/custom types/search, Part 3 (cron, `BillingEvent`, dunning, refunds, monitoring), live keys

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
