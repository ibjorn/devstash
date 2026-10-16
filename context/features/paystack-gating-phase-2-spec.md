# Paystack Gating — Phase 2 (Gates, UI & Vercel Demo)

## Overview

Wire the Phase 1 entitlements (`src/lib/entitlements.ts`,
`getPlanUsage()`) into the places that create things, add the UI that explains a
denial, and get billing working on the Vercel demo.

Source: Part 2 of `docs/paystack-integration-plan.md`. **Requires Phase 1**
(`context/features/paystack-gating-phase-1-spec.md`).

> 🚧 **Everything here is behind `BILLING_ENFORCED`.** Unset (the default), every
> gate runs its logic and then allows, so the demo behaves exactly as it does
> today. Set it to `"true"` to show the Free-tier wall and the upgrade flow.
>
> **Test mode only**, locally and on Vercel. No live keys, ever.

### Principles (from the plan)

- **The server is the gate.** Locked UI is a courtesy. Actions and routes decide.
- **One query per gate:** `getPlanUsage(userId)`.
- **Downgrade keeps data.** Over-limit users and existing File/Image items stay
  readable, editable, downloadable and deletable. Only *new* creation is blocked.
- **Count-then-create isn't atomic.** Two parallel creates at 49 can land 51.
  Accepted for a soft limit.

## Requirements

### 1. Gate — `createItem` (`src/actions/items.ts`)

After `getCreatableItemType` resolves `type`, and before the file checks:

```ts
const plan = await getPlanUsage(userId);
if (!plan) return { success: false, error: "You need to be signed in to create items." };

const denied = checkItemCreate(plan, type.name);
if (denied) return { success: false, error: DENIAL_MESSAGES[denied], upgrade: true };
```

Add `upgrade?: true` to `ItemActionResult`. `createItem` stays the
authoritative File/Image check, since the upload route can be skipped.

### 2. Gate — `createCollection` (`src/actions/collections.ts`)

Same shape after Zod validation, using `checkCollectionCreate(plan)`. Add
`upgrade?: true` to `CollectionActionResult`.

### 3. Gate — `POST /api/items/upload`

After `uploadKindFor` succeeds (every upload kind is a Pro type), and **before**
`checkRateLimit`, so a refused request doesn't spend the user's upload budget:

```ts
const plan = await getPlanUsage(userId);
if (!plan || !checkProFeature(plan)) {
  return NextResponse.json(
    { success: false, error: DENIAL_MESSAGES.PRO_TYPE, upgrade: true },
    { status: 403 },
  );
}
```

No presigned R2 URL is granted, so no orphan objects get created.

### 4. UI — locked File/Image in the New Item dialog

- Add `locked: boolean` to `CreatableItemType` (`src/types/items.ts`).
- `getCreatableItemTypes()` stays plan-agnostic. `AppShell` (the server
  component that already loads the types) fetches `getPlanUsage(userId)` and
  sets `locked = PRO_TYPE_NAMES.has(type.name) && !checkProFeature(plan)`. With
  enforcement off, nothing is locked.
- `NewItemDialog`: a locked type stays visible with a **Pro** badge. Choosing
  it shows a short note and an **Upgrade** link to `/settings#billing` instead
  of the upload field, and the submit is disabled.

### 5. UI — upgrade action on denial toasts

Wherever a create result or the upload response is toasted (`NewItemDialog`,
`NewCollectionDialog`, and the upload error path via `upload-client.ts`): when
`upgrade` is set, the Sonner toast gets an action:
`{ label: "Upgrade", onClick: () => router.push("/settings#billing") }`. Other
errors toast as today.

### 6. UI — settings billing section

`/settings` already loads `getDashboardStats` (`stats.items`,
`stats.collections`). Pass them to `BillingSection`.

- **Free state, enforcement on:** a usage line under the plan,
  `12 / 50 items · 2 / 3 collections`, built from `FREE_LIMITS`.
- **Free state, enforcement off:** no usage line, since the limits aren't real.
- **Non-renewing:** add `To switch between monthly and yearly, resubscribe after
  {periodEnd}.` It's generic because `User` doesn't store which plan is active.
  Copy only, closing plan open issue 4. No plan-switch logic.
- **Attention, past period end + 24 h, enforcement on:** add
  `Pro features are paused until the payment goes through.` The page computes
  this from `!hasProAccess(billing) && isBillingEnforced()` and passes it as a
  `paused` prop. `billingState()` still returns `"attention"` (Phase 1).

Pass `isBillingEnforced()` down as a prop. Client components never read
`process.env` for it.

### 7. Docs

- `context/project-overview.md`: rewrite the 🚧 "During development" note to say
  `BILLING_ENFORCED="true"` enforces the Free limits, and unset (the default)
  bypasses them.
- `.env.example` already has the flag (Phase 1).

### 8. Vercel demo deployment (test mode)

**Every step is done by Björn, deliberately, one at a time.** Claude may
prepare commands and checks, but runs nothing against production. The
**production database migration happens only on Björn's explicit say-so**,
restated and confirmed before it runs.

1. **Production database.** Phases 1–2 add **no** migration. What production is
   missing is `20261015120000_paystack_billing` from the shipped billing work.
   Run `npm run db:status` against production to confirm only that migration is
   pending, then `npm run db:deploy`. Explicit, confirmed, production-only.
2. **Vercel env vars** (Production environment):
   - `PAYSTACK_SECRET_KEY`: the same **`sk_test_…`** as `.env`. Double-check the
     `sk_test_` prefix. A `sk_live_` key must never be set.
   - `PAYSTACK_PLAN_CODE_MONTHLY` / `PAYSTACK_PLAN_CODE_YEARLY`: the same test
     plan codes as `.env` (one test account, so the same plans).
   - `APP_URL=https://<vercel-domain>`, with no trailing slash. It builds
     `callback_url`. If it's wrong, people land on localhost after checkout.
   - `BILLING_ENFORCED`: leave it unset, or set `"true"` only to demo the wall.
   - Redeploy so the vars take effect.
3. **Test webhook URL** (Paystack → Test mode → Settings → API Keys & Webhooks):
   `https://<vercel-domain>/api/webhooks/paystack`. This is the default resting
   state (see the workflow below).
4. **Smoke test** on Vercel with Paystack test cards: subscribe → `/settings`
   shows Pro → the Paystack dashboard's webhook log shows `200`s → Manage →
   cancel → settings shows `non-renewing` / "Pro until …".

Cross-traffic is harmless. A webhook for a user who only exists in the local
database matches no row on Vercel. `updateBilling` returns `0`, and nothing changes.

## Webhooks: local vs Vercel

Paystack has no Stripe-CLI-style forwarder. Test mode **appears to hold one
webhook URL** (unverified; check the dashboard), and local dev and Vercel share
test mode, so only one of them receives webhooks at a time.

| | Webhook URL points at Vercel (default) | Points at a local tunnel |
|---|---|---|
| Vercel | ✅ all events | ❌ none. Checkout still works via the callback. Missed cancels expire through `hasProAccess()` |
| Local | ❌ none. Same fallbacks | ✅ all events |

**Workflow for testing webhooks locally:**

1. `npm run dev`, then in a second terminal
   `cloudflared tunnel --url http://localhost:3000`. Copy the
   `https://<random>.trycloudflare.com` URL it prints. A quick tunnel gets a
   new URL every run.
2. Paystack → Test mode → set the webhook URL to
   `https://<random>.trycloudflare.com/api/webhooks/paystack`.
3. Test. The Paystack dashboard's webhook log shows each delivery and response.
4. **Set the URL back to the Vercel one when you're done**, and stop the tunnel.
   Anything Paystack sent to the dead tunnel in the meantime is retried hourly
   for 10 hours, so it may still land, possibly on the wrong side.

Avoid leaving an **hourly test plan** subscription running on whichever side
isn't receiving webhooks: its renewals (`invoice.update`) won't reach it.

## Tests

Colocated, Vitest `node` env, `vi.hoisted()` + `vi.resetAllMocks()`. Mock
`@/lib/db/entitlements` (`getPlanUsage`), `@/lib/prisma`, `@/auth`,
`@/lib/db/session-user` and `@/lib/rate-limit`. Toggle `BILLING_ENFORCED`
with `vi.stubEnv`. No `DATABASE_URL`, no network.

**`src/actions/items.test.ts`** (extend)

- Enforced, Free at 50 items → `ITEM_LIMIT` message, `upgrade: true`, no create.
- Enforced, Free, File type → `PRO_TYPE`, even at 0 items.
- Enforced, Free at 49 items → created.
- Enforced, Pro at 50 → created.
- Enforcement off, Free at 50 + File → created.
- `getPlanUsage` → `null` → the signed-in error, no create.

**`src/actions/collections.test.ts`** (extend)

- Enforced, Free at 3 → `COLLECTION_LIMIT`, `upgrade: true`. At 2 → created.
- Pro at 3 → created. Enforcement off at 3 → created.

**`src/app/api/items/upload/route.test.ts`** (extend)

- Enforced, Free → `403`, `checkRateLimit` **not called**, `createUploadUrl` not called.
- Enforced, Pro → `200` with an upload URL.
- Enforcement off, Free → `200`.
- A non-upload type still → `400`, before any plan lookup.

## Manual testing

Test mode. UI checks are Björn's, in Windows Chrome. No headless browsers.
Simulated states are set on the **development** branch (Prisma Studio).

**`BILLING_ENFORCED` unset** (regression):

- [ ] Free user creates a 51st item, a 4th collection and a File item. No Pro
  badges on dialog types, no usage line in settings.

**`BILLING_ENFORCED="true"`** (restart `npm run dev` after changing `.env`):

- [ ] Free: 50th item OK. The 51st is refused, and the toast's **Upgrade** opens `/settings#billing`
- [ ] Free: 3rd collection OK, 4th refused with the upgrade toast
- [ ] Free: File/Image shown with a Pro badge and locked in the New Item dialog
- [ ] Free: a forced upload request (DevTools → re-send the `POST /api/items/upload`) → `403`
- [ ] Settings (Free) shows `n / 50 items · n / 3 collections`
- [ ] Upgrade monthly with a Paystack test card → callback → settings shows Pro → limits lifted with no re-login
- [ ] Upgrade with **no tunnel** → still Pro via the callback. Pending resolves on reload
- [ ] Manage → cancel → `non-renewing`, still Pro, "Pro until …" + the switch-plan copy
- [ ] *(Optional, tunnel on)* Hourly test plan: renewal → `invoice.update` moves `currentPeriodEnd`
- [ ] Simulated missed disable (`non-renewing`, period end more than 24 h ago) → limits back, settings shows Free
- [ ] Simulated expired `attention` → settings shows the attention warning + "paused" copy. Limits apply. Upgrade isn't offered
- [ ] Downgraded user over the limits: existing items, collections and File items still open, edit, download and delete
- [ ] Second checkout while Pro → refused
- [ ] *(Tunnel on)* Webhook replay from the Paystack dashboard → no change

**Vercel:** the smoke test in Requirements §8, step 4.

Each step: `npm run lint`, `npm test`, `npm run build` (not while the dev
server runs).

## Out of scope

- Account deletion cancelling the subscription (its own `fix/` branch).
- Plan-switching logic. Copy only, here.
- Gating AI, export, custom types and search. None of these is built; they call
  `checkProFeature()` when they are.
- Everything in Part 3 of the plan: cron reconciliation, `BillingEvent`,
  dunning, refunds, monitoring.
- Live keys and a live webhook URL.

## References

- `docs/paystack-integration-plan.md`: Part 2 ("Files to modify", "Vercel demo deployment", "Testing checklist")
- `context/features/paystack-billing-spec.md`: sandbox setup, test cards
- Paystack webhooks: https://paystack.com/docs/payments/webhooks/
- Paystack test payments: https://paystack.com/docs/payments/test-payments/
- Cloudflare quick tunnels: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/
