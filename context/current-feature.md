# Current Feature

Server Actions Refactor — remove duplication and inconsistencies in `src/actions/`

## Status

In Progress

## Goals

1. **Shared row-id guard** — `isId` in `src/lib/flag-action.ts` and `isCollectionId` in `src/actions/collections.ts` are identical. Extract one `isRowId()` into `src/lib/validation/` and use it in both, plus:
   - `deleteItem` (`src/actions/items.ts`) — replace its weaker inline check (no 64-char cap)
   - `updateItem` (`src/actions/items.ts`) — add the guard; it has none, so a non-string id currently surfaces as a Prisma validation error, logged as a failure and toasted generically instead of "That item no longer exists."
2. **Signed-out handling in `src/actions/profile.ts`** — `changePassword` and `deleteAccount` call `requireUserId()` inside the `try`, so a signed-out call throws, is logged as a failure and returns a generic error. Switch to `getSessionUserId()` with an explicit "You need to be signed in…" result, matching every other action (and the comment in `src/lib/db/session-user.ts`).
3. **Hoist repeated error strings to constants**
   - `"That item no longer exists."` ×4 in `src/actions/items.ts` → `GONE` const, as `collections.ts` already does
   - `"Choose monthly or yearly billing."` ×2 in `src/actions/billing.ts`
4. **Shared field-error result** — `toFieldErrors` is defined in both `items.ts` and `profile.ts`, and inlined twice in `collections.ts`. Add `fieldErrorResult(error)` beside `fieldErrorsFrom` in `src/lib/validation/field-errors.ts` and use it in all three.
5. **Generic `ActionResult<T>`** — `FlagActionResult`, `EditorPreferencesActionResult`, `CollectionActionResult<T>`, `ItemActionResult`, `ProfileActionResult` and `BillingActionResult` are all subsets of `{ success, data?, error?, fieldErrors?, upgrade? }`. Add `ActionResult<T>` in `src/types/actions.ts` and turn the feature-named types into aliases, so the ~10 consuming components/hooks don't change.
6. **Plan-gate helper** — `createCollection` and `createItem` repeat the same block: `getPlanUsage` → null means signed out → run the check → `DENIAL_MESSAGES[denied]` with `upgrade: true`. Extract a `planDenial(userId, check)`-style helper that returns a result or null.
7. **Shared `formData()` test helper** — the same builder is copied in `src/actions/auth.test.ts` and `src/actions/profile.test.ts`. Move it to `src/test/form-data.ts`, a new folder. The name has no `.test` suffix, so the `src/**/*.test.ts` include doesn't run it as a suite. Import it from both test files.

## Notes

- Found by a scan of `src/actions/` on 2026-10-20.
- Behaviour changes are limited to goals 1 (`updateItem`/`deleteItem` id guard) and 2 (profile signed-out message). Both need unit tests in the colocated `*.test.ts`. `profile.test.ts` currently mocks `requireUserId`, so it will need to mock `getSessionUserId` instead.
- Goals 3–7 are pure refactors: existing tests should pass unchanged.
- Out of scope (reviewed, deliberately left alone): wrapping the per-action signed-in guard in a `withUser()` helper; merging `removeObject`/`deleteUserFiles`; merging `startCheckout`/`resubscribe`; sharing the per-file `signedIn()` test helper.
- Follow-up candidate: `FavoriteActionResult` is a bare alias of `FlagActionResult`, and `src/hooks/` has both `use-favorite-toggle.ts` and `use-flag-toggle.ts`. Scan `hooks/` separately.

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
