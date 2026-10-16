# Paystack Gating — Phase 1 (Entitlements Core)

## Overview

Build the Free-vs-Pro entitlement logic that the Phase 2 gates will call, and
fix the most visible billing bug in the demo: **a cancelled subscriber stays
Pro forever when `subscription.disable` never arrives** (open issue 1 in
`docs/paystack-integration-plan.md`). Locally there's usually no webhook
tunnel, so that event *never* arrives.

Source: Part 2 of `docs/paystack-integration-plan.md`. Checkout, the callback,
the webhook and the settings billing section already shipped in `93d4312`
(`context/features/paystack-billing-spec.md`). Nothing here re-specs them.

> 🚧 **With `BILLING_ENFORCED` off (the default), the only behaviour change is
> that an expired `non-renewing` subscription shows as Free in settings and can
> subscribe again.** Nothing calls the `check*` functions until Phase 2.

### Decisions (answered by Björn, 2026-10-16)

| Open question | Answer |
|---|---|
| Grace past `currentPeriodEnd` (plan open question 2) | **24 hours** |
| Does `attention` (failed renewal) expire too? (plan open question 4) | **Yes, same rule.** Past `currentPeriodEnd` + 24 h, `attention` has no Pro access |
| What does settings show for an expired `attention` user? | **Still the attention state** (failed-payment warning + Manage). `startCheckout` keeps refusing, because Paystack may still retry the old subscription and a new one would double-charge |

So entitlements expire `non-renewing` **and** `attention` past the grace, but
only `non-renewing` turns into "Free" in the settings UI. The "Pro is paused"
copy for expired `attention` is Phase 2 UI.

## Requirements

### 1. Move `PRO_TYPE_NAMES` → `src/lib/system-types.ts`

It's a module-private `const` in `src/lib/db/item-types.ts` today. Move it to
`src/lib/system-types.ts` (import-free, already the seed's source of truth),
export it, and import it back into `db/item-types.ts`. Pure logic must not pull
in Prisma.

```ts
// Pro-only system types, keyed by singular name
export const PRO_TYPE_NAMES: ReadonlySet<string> = new Set<SystemTypeName>(["File", "Image"]);
```

No behaviour change. The sidebar Pro badge keeps working.

### 2. Entitlements logic — `src/lib/entitlements.ts`

Pure, no I/O, no Prisma import.

- `FREE_LIMITS = { items: 50, collections: 3 } as const`
- `EXPIRY_GRACE_MS = 24 * 60 * 60 * 1000` (module-private), with a comment on
  why: a `subscription.disable` that's late or never arrives.
- `isBillingEnforced()` returns `process.env.BILLING_ENFORCED === "true"`. Only
  the literal `"true"` counts. `"TRUE"`, `"1"`, `"yes"` and unset are all off,
  matching the `SKIP_EMAIL_VERIFICATION` precedent.
- `PlanUsage` interface: `isPro`, `subscriptionStatus`, `currentPeriodEnd`,
  `items`, `collections`.
- `hasProAccess(plan, now = new Date())` takes a **narrow** parameter type
  (`ProAccessFields`: `isPro`, `subscriptionStatus`, `currentPeriodEnd`), so
  billing code doesn't have to invent dummy counts. `PlanUsage` still
  satisfies it.

  ```ts
  // Statuses whose access runs out at currentPeriodEnd unless Paystack tells us
  // otherwise — non-renewing (cancelled) and attention (renewal failed)
  const EXPIRING_STATUSES: ReadonlySet<string> = new Set(["non-renewing", "attention"]);

  export function hasProAccess(plan: ProAccessFields, now = new Date()): boolean {
    if (!plan.isPro) return false;
    if (!plan.subscriptionStatus || !EXPIRING_STATUSES.has(plan.subscriptionStatus)) return true;
    if (!plan.currentPeriodEnd) return true;
    return now.getTime() < plan.currentPeriodEnd.getTime() + EXPIRY_GRACE_MS;
  }
  ```

  `active`, pending (Pro with no subscription yet) and a missing period end all
  stay Pro. An `isPro: false` user is never Pro, whatever the status says.

- `Denial = "ITEM_LIMIT" | "COLLECTION_LIMIT" | "PRO_TYPE"` and
  `DENIAL_MESSAGES: Record<Denial, string>`:

  | Denial | Message |
  |---|---|
  | `ITEM_LIMIT` | `Free accounts hold up to 50 items. Upgrade to Pro for unlimited.` |
  | `COLLECTION_LIMIT` | `Free accounts have up to 3 collections. Upgrade to Pro for unlimited.` |
  | `PRO_TYPE` | `File and image items are a Pro feature.` |

  Build the numbers from `FREE_LIMITS`, not literals.

- Checks. Each one returns "allowed" when enforcement is off **or** the user has
  Pro access, so the logic still runs while the flag is off:
  - `checkItemCreate(plan, typeName): Denial | null`: `PRO_TYPE` for a name in
    `PRO_TYPE_NAMES`, whatever the count. Otherwise `ITEM_LIMIT` when
    `plan.items >= FREE_LIMITS.items`.
  - `checkCollectionCreate(plan): Denial | null`: `COLLECTION_LIMIT` when
    `plan.collections >= FREE_LIMITS.collections`.
  - `checkProFeature(plan): boolean` is for uploads now, and for AI, export and
    custom types once they exist.

The counts are what the user holds **before** the create, so 49 items → allowed
(the 50th), 50 → denied.

### 3. The one query — `src/lib/db/entitlements.ts`

`getPlanUsage(userId): Promise<PlanUsage | null>`: a single
`prisma.user.findUnique` selecting `isPro`, `subscriptionStatus`,
`currentPeriodEnd` and `_count: { select: { items: true, collections: true } }`,
flattened into `PlanUsage`. Returns `null` for a stale session (no row), as
`getBillingUser` does. Exactly as in the plan's "Files to create §2".

### 4. `billingState()` — `src/lib/billing.ts`

Add `currentPeriodEnd: Date | null` to the parameter (`getBillingUser` already
selects it) and an optional `now = new Date()`. Order matters:

```ts
if (!user.isPro) return "free";
if (!user.paystackSubscriptionCode) return "pending";
// Paystack may still retry a failed renewal, so keep pointing the user at their
// card rather than at a second subscription — even past the grace
if (user.subscriptionStatus === "attention") return "attention";
// A cancelled period that ran out without subscription.disable reaching us
if (!hasProAccess(user, now)) return "free";
if (user.subscriptionStatus === "non-renewing") return "non-renewing";
return "active";
```

The `/settings` page already passes the full `getBillingUser` result, so no
call-site change beyond the type. An expired `non-renewing` user sees the
upgrade buttons again.

`src/lib/billing.ts` importing `@/lib/entitlements` is fine: both are pure.

### 5. `startCheckout()` — `src/actions/billing.ts`

Today it refuses while `user.isPro` **or** `isLiveSubscriptionStatus(...)`, and
`non-renewing` counts as live, so an expired user is refused twice over.
Replace that with:

- **Refuse** while `hasProAccess(user)` is true. That covers active, pending,
  and non-renewing/attention within the grace.
- **Refuse** while the status is `active` or `attention`, since either can
  still charge. An expired `attention` user gets a message that points at the
  existing subscription, e.g. `Your last payment failed. Update your card under
  Manage subscription instead of starting a new one.`
- **Allow** an expired `non-renewing` user. That subscription won't charge
  again.

If `isLiveSubscriptionStatus` has no other callers afterwards, leave it alone
anyway: the deletion fix (out of scope) uses it.

### 6. `.env.example`

Next to `SKIP_EMAIL_VERIFICATION`:

```
# Pro gating. Only a literal "true" enforces Free limits (50 items, 3 collections,
# no File/Image). Off by default, so every user gets everything; turn it on to
# demo the Free-tier limits and the upgrade flow.
BILLING_ENFORCED="false"
```

## Tests

Colocated, Vitest `node` env, `vi.hoisted()` + `vi.resetAllMocks()`. **Every
test passes with no `DATABASE_URL` and no network.** Set and restore
`process.env.BILLING_ENFORCED` per test (`vi.stubEnv` / `vi.unstubAllEnvs`). Pass
`now` explicitly instead of faking timers.

**`src/lib/entitlements.test.ts`**

- `isBillingEnforced`: `"true"` → true. `"TRUE"`, `"1"`, `"false"`, `""` and
  unset → false.
- Enforcement off: every check allows: 50+ items, 3+ collections, File and
  Image, a Free user, an expired user.
- Enforced, Free: 49 items allowed, 50 → `ITEM_LIMIT`. File and Image →
  `PRO_TYPE` even at 0 items. 2 collections allowed, 3 → `COLLECTION_LIMIT`.
  `checkProFeature` → false.
- Enforced, Pro: 500 items, 50 collections and File all allowed.
  `checkProFeature` → true.
- Enforced, expired (non-renewing past the grace): treated as Free.
- `hasProAccess`:
  - `active` → true. Pending (`isPro`, no status) → true. `isPro` with a null
    period end → true.
  - `non-renewing`: before the end → true. 23 h past → true (within grace). 25 h
    past → false.
  - `attention`: same three cases, same results.
  - `isPro: false` → false for every status.
- `DENIAL_MESSAGES` mention the `FREE_LIMITS` numbers. One assertion each, so a
  limit change can't leave stale copy.

**`src/lib/db/entitlements.test.ts`** (`@/lib/prisma` mocked)

- Flattens `_count` into `items` / `collections` and passes the billing fields
  through.
- Queries by `id` with a `select` (no `include`): one query.
- No row → `null`.

**`src/lib/billing.test.ts`** (`billingState`, extend)

- Expired `non-renewing` (past the grace) → `"free"`.
- `non-renewing` within the grace → `"non-renewing"`.
- Expired `attention` → still `"attention"`.
- Existing cases still pass with `currentPeriodEnd` added.

**`src/actions/billing.test.ts`** (`startCheckout`, extend)

- Expired `non-renewing` user → `initializeTransaction` called, success.
- `non-renewing` within the grace → refused, no Paystack call.
- `attention`, expired or not → refused, no Paystack call.
- `active` → refused (existing case, still green).

Existing billing suites stay green: `paystack`, callback, webhook,
`subscription-sync`, `exchange-rate`, `db/item-types`.

## Manual testing

Test mode only. `BILLING_ENFORCED` unset.

- [ ] Free user: nothing changes anywhere. A 51st item, a 4th collection and a
  File item can all still be created.
- [ ] Active Pro user: settings unchanged.
- [ ] Simulated missed disable: on the **development** branch (Prisma Studio),
  set a Pro user to `non-renewing` with `currentPeriodEnd` more than 24 h ago →
  settings shows Free with upgrade buttons → checkout opens Paystack.
- [ ] Same user with `currentPeriodEnd` 12 h ago → still "Pro until …".
- [ ] Set `attention` with `currentPeriodEnd` more than 24 h ago → settings still
  shows the failed-payment warning. Upgrade isn't offered.

Then `npm run lint`, `npm test`, `npm run build` (not while the dev server
runs), and a visual check in Windows Chrome.

## Out of scope

- Server gates, UI (locked types, upgrade toasts, usage line), docs and the
  Vercel deployment. All of that is **Phase 2**.
- Account deletion cancelling the subscription (its own `fix/` branch, per the
  plan).
- Plan switching, dunning, cron reconciliation, and anything in Part 3 of the plan.
- Live keys.

## References

- `docs/paystack-integration-plan.md`: Part 2 ("Files to create", "billingState()" under "Files to modify")
- `context/features/paystack-billing-spec.md`: what already shipped
- Paystack subscription statuses: https://paystack.com/docs/payments/subscriptions/
