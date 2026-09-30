# Refactor — Code Extraction

Break up large blocks and remove repeated code across `src/`, from the 2026-09-30 extraction review. **No behaviour change intended**, no schema change, no migration, no new dependency. Every item below is a move or an extraction; if one turns out to need a behaviour change to fit, stop and flag it rather than forcing it.

## Goals

### Client components

- **`useItemForm` hook** (new, e.g. `src/components/items/useItemForm.ts`): owns `values` + `handleChange`, `fieldErrors`, `pending`, and a `submit(call, messages)` that keeps the established shape — the `try` wraps **only** the action call, success handling sits after it, field errors render inline and only a failure with no field to blame is toasted. Replaces the duplicated logic in `NewItemDialog.tsx:374-458` and `ItemEditForm.tsx:301-358`.
- **Split `ItemDrawer.tsx`** (263 lines, ~170 lines of JSX in one render):
  - `ItemContentSection` — the code / markdown / plain `<pre>` choice (lines 159-184)
  - `ItemFileSection` — image preview + download (186-217)
  - `ItemDetailsSection` — created/updated dates
  - `ItemSheetHeading` — type icon + title + type badge, shared with `ItemEditForm.tsx:369-379` (edit mode passes "Edit item" as the title and omits the language badge)
- **`useCopyToClipboard()` hook**: the copy + restart-don't-stack 2s check-mark timer, used by `CodeEditor`, `MarkdownEditor` and `CopyItemButton`. `CopyItemButton`'s `ClipboardItem`-promise path (Safari) must survive — the hook may need to accept a string *or* a promise, or CopyItemButton keeps its write logic and only shares the timer. Decide when implementing.
- **`EditorWindowHeader`**: the traffic-light dots, a label/tabs slot and the copy button, shared by `CodeEditor` and `MarkdownEditor`.
- **Split `FileUpload.tsx`** (301 lines): `UploadedFilePreview`, `UploadProgress` and `DropZone` components for the three render states; move `requestGrant` and `putWithProgress` to `src/lib/upload-client.ts`.
- **`ItemTypePicker`**: the type button row from `NewItemDialog.tsx:486-525`.
- **`CollectionNavItem`** in `AppSidebar.tsx`: the shared link structure of the Favorites and Recent entries, with the trailing star / count and the leading folder icon / colour dot as props or slots.

### Server side

- **`parseJsonBody(request, schema, fallbackMessage)`** in `src/lib/`: returns `{ data } | { response }`, covering the invalid-JSON 400 and the first-issue Zod 400. Used by register, password/forgot, password/reset, verify/resend and items/upload. Response bodies and status codes must stay byte-identical.
- **Email cooldown check**: the `Date.now() - issuedAt(expires) < EMAIL_COOLDOWN_MS` block shared by password/forgot and verify/resend becomes one helper next to `EMAIL_COOLDOWN_MS`. It must stay inside `after()` in both routes (the timing-oracle fix).
- **Split `src/lib/db/items.ts`** (438 lines): move `SYSTEM_TYPE_ORDER`, `PRO_TYPE_NAMES`, `SYSTEM_TYPE_CONTENT`, `contentTypeFor`, `systemTypeOrder`, `getItemTypeNavItems`, `getCreatableItemTypes` and `getCreatableItemType` to `src/lib/db/item-types.ts`. Update imports and move the matching tests.
- **`connectUserTags(userId, names)`**: the `connectOrCreate` on `userId_name` mapping written twice in `updateItem` and `createItem`.
- **`toCreatableItemType`**: the DTO both creatable-type queries build.
- **Type-name pluralisation helpers**: `pluralTypeName(name)` and `typeSlug(name)` beside `singularFromSlug`, replacing the ad-hoc `` `${name}s` `` / `.toLowerCase()` in items.ts (×3), `src/app/items/[type]/page.tsx`, `ItemDrawer` and `ItemEditForm`. It must live somewhere client components can import, i.e. not in a Prisma module.
- **`isPrismaError(error, code)`**: replaces the inline `PrismaClientKnownRequestError && code === …` checks in `src/actions/items.ts` (P2025 ×2) and the register route (P2002).
- **Session guard for actions**: a helper that returns the session user id or null (unlike `requireUserId()`, which throws), replacing the three-line guard in all three item actions.

### Gate

- `npm run lint`, `npm test` and `npm run build` pass.
- Unit tests for every new server-side helper (`parseJsonBody`, cooldown check, `isPrismaError`, pluralisation helpers, `connectUserTags` / `toCreatableItemType` via the existing query tests). Existing action and route tests must pass **unchanged in their assertions** — that is the proof there's no behaviour change.
- Prettier adds no new violations to files that were clean on main.

## Notes

- **Deliberately out of scope:** splitting `authorize()` in `src/auth.ts` (the rate-limit → bcrypt → verification order is itself a security property); CodeEditor's options object (configuration, not logic); an ItemCard/ItemRow shared shell (their markup differs in almost every line).
- **Watch the `react-hooks/static-components` lint rule**, which has bitten this codebase three times: don't resolve an icon component into a top-level `const Icon = …` inside a component. Passing an icon component as a prop is fine.
- **Hooks in client components only**; the new server helpers must not be imported into `"use client"` files, and the pluralisation helper must not pull in Prisma.
- `useItemForm`'s success path is where the Profile Page, Edit Mode and Delete Item reviews each caught a bug. Review that the `try` still wraps only the action call.
- This is large for one commit. If it gets unwieldy, a split between the client and server halves is the natural seam — ask before doing that.
- **Browser check in Windows Chrome** (no visual change is expected, so this is regression-checking): New Item dialog (every type, including a file and an image upload and switching type mid-form), drawer view + edit + save + delete, copy in both editors and on cards, the sidebar's Favorites and Recent groups, and the forgot-password / resend / register flows.
