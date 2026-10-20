# Current Feature: Hooks Refactor

## Status

In Progress

## Goals

- **Shared abortable POST** — extract `useAbortablePost()` in `src/hooks/use-abortable-post.ts` holding the plumbing `useAiStream` and `useAiSuggestion` duplicate: the controller ref, abort on unmount, abort-previous on a new request, the JSON `fetch` POST, and the `isCurrent()` guard so a superseded request can't clear a newer one's pending flag. Both AI hooks keep only what differs (envelope parsing vs. stream reading)
- **Matching AI hook signatures** — `useAiStream` takes an optional `onUpgrade` like `useAiSuggestion`, passed through to `useErrorToast`
- **Split `useAiStream.start`** — move the stream read loop into a plain `readTextStream(body, onChunk)` so `start` is under 50 lines
- **Generic action runner** — add `useActionRunner()` returning `{ pending, run }`: `run(call, { failed, unreachable })` resolves to the result's data (or the result) or `null` after toasting, with only the action call inside the `try`, so a caller's success handling can never be toasted as a failure
- **Adopt the runner** in the components that hand-roll pending + try + "Could not reach the server" toast, where it fits without bending their behaviour
- **One unreachable message** — default to a single `"Could not reach the server. Please try again."`, keeping the context-specific variants (e.g. "— the item was not created.") where a caller passes its own

## Notes

- Behaviour must not change: same toasts, same pending semantics, same abort-on-close
- `useRedirectAction` stays separate — it deliberately leaves `pending` on after success while the browser leaves for Paystack
- `useItemForm.submit` is the item-specific version of the runner (field errors, upgrade); leave it as-is unless it can sit on top of the runner cleanly
- Leave `use-mobile.ts` (shadcn-generated), `useFavoriteToggle`, `useCopyToClipboard` and `useErrorToast` alone
- Components to check for the runner: DeleteItemDialog, DeleteCollectionDialog, DeleteAccountDialog, ChangePasswordDialog, SetPasswordButton, ResendVerification, BillingSection (resubscribe), EditCollectionDialog, NewCollectionDialog, PromptOptimizer, and the auth forms (Register, ForgotPassword, ResetPassword). Fetch-based ones (SetPasswordButton, ForgotPassword…) may not fit an action runner — skip rather than force them
- Unit tests: hooks are client code and the suite has no jsdom, so no hook tests; any pure helper extracted into `src/lib/` (e.g. `readTextStream`) gets a colocated test
- Verify with lint, test, build; Björn checks the AI features, deletes and billing visually in Windows Chrome

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
