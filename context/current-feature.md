# Current Feature: Components Refactor

## Status

In Progress

## Goals

Dedupe and break up `src/components/` from a refactor scan (2026-10-20). `ui/` is shadcn-owned and out of scope. Behaviour, copy and visuals stay the same unless a goal says otherwise.

### Shared building blocks

1. **Form field + error markup** — the Label + Input + `aria-invalid` / `aria-describedby` + `<p id="{field}-error">` pattern is repeated in `RegisterForm`, `ResetPasswordForm`, `ChangePasswordDialog`, `ForgotPasswordForm`, `DeleteAccountDialog` and `FileUpload`, and `ItemFormFields` and `CollectionFormFields` each have their own local `errorProps` / `FieldError` helper. Add one shared `FieldError` + `fieldErrorProps(field, errors, idPrefix?)` and a `<FormField>` wrapper in `src/components/forms/`, and adopt it everywhere. Error text is `text-sm` in the auth/profile forms but `text-xs` in the item/collection forms: pick one size and use it everywhere.
2. **Delete confirmation shell** — `DeleteItemDialog` and `DeleteCollectionDialog` already share `useActionRunner`, but their AlertDialog shells are still identical: the guard against closing mid-delete, `preventDefault` on the action, and the Cancel / destructive Delete footer with spinner. Extract a `ConfirmDeleteDialog` (title, description, `onConfirm`, `failed` message, and either a trigger or controlled `open`/`onOpenChange`) and build both dialogs on it.
3. **Auth fetch POST** — `RegisterForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `ResendVerification` and `SetPasswordButton` all repeat the same POST JSON → `!ok` → toast `result.error ?? fallback` → catch toast → `finally setPending`. Add a `postJson()` helper in `src/lib/` (unit tested) and use it in all five. Use `UNREACHABLE_MESSAGE` from `src/lib/messages.ts` instead of the hard-coded string.
4. **Email cooldown** — `ForgotPasswordForm` and `SetPasswordButton` both have the lockout tick effect, the `sent`/`lockout` state, the countdown label and the "link expires in an hour" paragraph. Add a `useEmailCooldown()` hook and a `<ResetLinkSentNote>`.
5. **Editor header tabs** — the same `TabsList variant="line" className="h-6! p-0"` with two `px-2 text-xs` triggers appears in `CodeExplainer`, `PromptOptimizer` and `MarkdownEditor`. Extract an `<EditorTabs>`. Optionally also extract an `<AiHeaderButton>` for the AiProLock-or-button branch and the Sparkles / RotateCw / Loader2 icon switching that `CodeExplainer` and `PromptOptimizer` share.
6. **Item card shells** — `ItemCard` and `ItemRow` share the type-tinted border style, the tag badges, the pin icon, the favorite + copy overlay, and the fragile `isCopyable(item) ? "pr-16 …" : "pr-7 …"` padding that reserves room for the overlay buttons. Extract `<ItemCardActions>`, `<ItemTagList>` and an `itemBorderStyle(type)` helper, and keep the reserved padding next to the overlay so they can't drift apart. `ImageCard` uses the same border tint.

### Quick wins

7. `ItemDrawerActions.handleCopy` reimplements `useCopyToClipboard().copy` with the same toasts. Use the hook.
8. The icon-button class string is copied into `FavoriteItemButton`, `CopyItemButton`, the `FileRow` download link and the `CollectionCardMenu` trigger. Use one shared constant.
9. `isFavorite && "fill-yellow-400 text-yellow-400"` appears in 6 files. Replace it with a `<FavoriteStar active>`.
10. "item"/"items" is pluralised inline in `SearchPalette`, `CollectionCard` and `FavoriteCollectionRow`, and `plural()` is private to `DeleteAccountDialog`. Move `plural()` to `src/lib/` (tested) and use it in all four.
11. The one-time toast from the URL, then `stripSearchParam`, appears in `SignInForm` (×2), `ForgotPasswordForm` and `BillingSection`. Replace it with a `useHandoffToast(message, param, kind)` hook.
12. The "OR" divider is in both `SignInForm` and `RegisterForm`. Extract an `<AuthDivider>`.
13. `CollectionActions` and `CollectionCardMenu` both own `editOpen`/`deleteOpen` + `useFavoriteToggle` + both dialogs. Move that into a `useCollectionActions()` hook.
14. `pending && <Loader2 …>` appears 16 times. Add a `<SubmitButton pending>` (or `<PendingIcon>`) and adopt it where it reads cleaner.

### Break up large components

15. **`ItemFormFields`** (275 lines): adopt `<FormField>` (#1), extract a `ContentField` (code / markdown / plain), and add an `aiDraftFrom(values, visible)` helper for the two AI drafts that repeat the `visible.x ? values.x : ""` logic.
16. **`NewItemDialog`** (269 lines): move `LockedTypeNote` and the upload block (`ItemUploadField`) to their own files. Move `initialTypeId` to `src/lib/` with a test. Export the all-false `visible` fallback as `NO_VISIBLE_FIELDS` next to `visibleFieldsFor`.
17. **`SearchPalette`** (256 lines): split into `SearchTrigger` (the button with keyboard hints), `SearchItemResult`, `SearchCollectionResult`, a `useSearchIndex()` hook (fetch + stale-request guard) and the Ctrl/⌘K hotkey effect.
18. **`BillingSection`** (259 lines): move `PlanOptions`, `ResubscribeOptions` and `SubscriptionStatus` into their own files. Move `statusLine()` to `src/lib/billing.ts` with tests.
19. **`PromptOptimizer`** (212 lines): extract the result panel as `OptimizeResultPanel`. Its `handleUse` rebuilds the full `updateItem` payload from `detail`; add an `updateInputFrom(detail, overrides)` helper so it can't drift from `ItemEditForm`.
20. **`AppSidebar`** (208 lines): extract a `NavLinkItem` (the main links and type links render the same `SidebarMenuItem` + `isActive` + `NAV_ACTIVE_CLASS`), plus small `ProBadge` and `CollectionDot` components.
21. **`ItemDrawer`** (167 lines, low priority): Tags and Collections are the same badge list, so one `BadgeListSection`.

## Notes

- Suggested order: #1 → #2 → quick wins (#7–#14) → splits (#15–#21). #1 removes the most code and fixes the `text-sm`/`text-xs` drift.
- Already covered by the Hooks Refactor (`useActionRunner`), so out of scope: the collection New/Edit submit logic, and the try/catch/finally in the delete dialogs and `ChangePasswordDialog`.
- Leave as is: `ChaosAnimation` (already split into pure helpers + `useChaos`), `FileUpload` (already split into DropZone / UploadProgress / UploadedFilePreview), `CodeEditor` (its length is Monaco options), `EditorPreferencesForm` (already uses a local `PreferenceRow`).
- Unit tests only for the new `lib/` helpers (`postJson`, `plural`, `statusLine`, `initialTypeId`, `updateInputFrom`, `aiDraftFrom` if it lands in lib). No component tests, per the testing rules.
- Visual check in Windows Chrome afterwards. The areas most at risk are the item cards/rows (overlay padding), the auth and profile forms (error text size) and the sidebar.
- Keep `src/lib/mock-data.ts` untouched.

### Implementation notes (2026-10-20)

- All 21 goals implemented on `feature/components-refactor`. `npm run lint`, `npm test` (695 passing) and `npm run build` are clean.
- New shared pieces: `components/forms/` (`FormField`, `FieldError`, `fieldErrorProps`, `PendingButton`), `components/dialogs/ConfirmDeleteDialog`, `components/items/card-styles.ts` (`CARD_ICON_BUTTON`, `itemBorderStyle`), `ItemCardActions` / `overlayClearance`, `ItemTagList`, `EditorTabs`, `FavoriteStar`, `AuthDivider`, `ResetLinkSentNote`, `NavLinkItem`, `BadgeListSection`.
- New hooks: `use-handoff-toast` (uses React 19.2 `useEffectEvent`), `use-email-cooldown`, `use-collection-actions`, `use-search-index`, `use-palette-hotkey`.
- New tested lib helpers: `plural`, `postJson`, `billingStatusLine` (in `lib/billing.ts`), `initialTypeId`, `updateInputFrom`. `aiDraftFrom` stayed private to `ItemFormFields`.
- Deliberate visual changes:
  - Field errors are `text-sm` everywhere (they were `text-xs` in the item/collection forms).
  - The drawer's Copy button now shows a check mark for 2s, like every other copy button, because it uses `useCopyToClipboard`.
  - The `ItemEditForm` Save spinner uses the sm button's default 14px icon instead of 16px.
  - For free users (no AI buttons), the Description label row loses the `min-h-7` it reserved for the AI button.
- `<AiHeaderButton>` (optional in #5) wasn't extracted: the Explain button has a Stop state and Optimize has a disabled-while-saving state, so a shared component would mostly be props.

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
