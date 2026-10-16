# Current Feature

Paystack Loose Ends — cancel the subscription on account deletion

## Status

In Progress

## Goals

- `deleteAccount` disables the user's Paystack subscription **before** deleting any rows, so a deleted account can't keep being charged (open issue 3 in docs/paystack-integration-plan.md)
- Only call Paystack when the subscription can still charge: `active` or `attention`. `non-renewing` is already cancelled on Paystack's side and a second disable may be refused, which would block the deletion for nothing. This narrows the plan doc's `isLiveSubscriptionStatus` check
- If the cancel fails, **abort** the deletion and tell the user to try again; never delete a row whose subscription is still charging
- New `disableSubscription(code, token)` in src/lib/paystack.ts (`POST /subscription/disable`, body `{ code, token }`, response has no `data`)
- `DeleteAccountDialog` warns Pro users that deleting cancels Pro immediately and forfeits the rest of the paid period
- Unit tests: disable called with code + token before the transaction; a failed disable means no transaction and an error; no call for `non-renewing`, ended or missing subscriptions
- Docs: mark open issue 3 resolved in the integration plan

## Notes

- No schema change, no migration. `paystackEmailToken` is already stored
- The `subscription.disable` webhook that follows matches no row (`updateBilling` returns 0), which the handler already treats as harmless
- Already done, no work needed: the plan-switching copy for `non-renewing` in BillingSection (open issue 4)
- **Björn's side (not code):**
  - Finish the Phase 2 Chrome checks with `BILLING_ENFORCED="true"`: the 50-item limit, the 3-collection limit, File/Image locked for Free, upgrade, and limits lifting
  - Vercel deploy: production migration, test keys and plan codes in Vercel, `APP_URL`, the webhook URL in the Paystack dashboard, the production origin in the R2 CORS rule, and `BILLING_ENFORCED`

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
