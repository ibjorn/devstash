# Fix — Audit Cleanup (duplication)

Follow-up to **Fix — Audit Quick Wins**, from the 2026-09-30 code-scanner audit. Two low-risk duplication removals, kept on their own branch so the security fixes stay a focused commit. No behaviour change intended, no schema change, no new dependency.

## Goals

- **One `toFieldErrors`:** the identical helpers in src/actions/items.ts:44-51 and src/actions/profile.ts:37-44 move to a shared `src/lib/validation/field-errors.ts`, and both action files import it. Consider also replacing the inline copy in src/components/profile/ChangePasswordDialog.tsx:61-66, but only if its typing (`FieldName` keys, first-wins `??=`) fits without contortion.
- **`ItemTypeIcon` reused for the type chip:** add a `size` prop to src/components/items/ItemTypeIcon.tsx (currently hardcoded `size-10`) and use it for the inline chip copies in `ItemCard.tsx:44-53`, `ItemRow.tsx:37-46`, `FileRow.tsx:36-47` and `src/app/items/[type]/page.tsx:52-61`. Keep each call site's current size and tint. FileRow renders a *file-extension* icon rather than the type icon, so the prop may need to accept an icon override, or FileRow stays as it is. Decide when implementing rather than forcing it.
- `npm run lint`, `npm test` and `npm run build` pass; existing action tests still cover the field-error mapping.

## Notes

- The chip change is visual, so Björn should check it in Windows Chrome: the dashboard lists, `/items/snippets`, `/items/files` and the drawer header.
- Watch the `react-hooks/static-components` lint rule, which has bitten this codebase twice (Items List View, File List View): don't resolve an icon component into a top-level `const Icon = …` inside a component.
