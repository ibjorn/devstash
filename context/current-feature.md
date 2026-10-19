# Current Feature: AI Prompt Optimizer

## Status

In Progress

## Goals

- Pro-only **Optimize** button in the header of the drawer's Markdown content view for **Prompt** items, placed and styled like the **Explain** button on snippets/commands (`CodeExplainer`)
- Free users see the same Crown lock linking to `/upgrade` that Explain uses
- `POST /api/ai/optimize` (gpt-6-luna, structured output) reviews the current prompt and returns `{ prompt, changes }` — it refines only where needed; an already-good prompt comes back unchanged with an empty `changes[]` and the UI says so ("Already in good shape") instead of offering a no-op
- Results show the optimized prompt alongside the original (Original / Optimized tabs or diff) plus the `changes[]` bullet list, then ask the user whether to use it: **Use optimized prompt** / **Copy** / **Discard**
- Accepting writes the new content through the existing `updateItem` action (toast on success/failure, drawer refreshes); discarding leaves the item untouched
- Loading, error (rate-limited, 403 upgrade, truncated/incomplete response) and empty-content states handled
- Unit tests for the route handler and the `src/lib/ai/optimize` input/output helpers (Pro guard, validation, rate-limit, incomplete response → error, unchanged-prompt case)

## Notes

- Follows `docs/ai-integration-plan.md`: §1 settings (JSON `{ prompt: string, changes: string[] }`, reasoning effort `low`, `max_output_tokens` 3,000, input cap 20,000 chars); §3 route layout (`src/app/api/ai/optimize/route.ts`, schema in `src/lib/validation/ai.ts`); non-streaming, since a partial prompt can't be accepted
- Reuse the shared AI foundation: `src/lib/ai/guard.ts` (`checkProFeature` + fail-closed `ai` rate limit), `src/lib/ai/errors.ts`, `src/lib/openai.ts`, usage logging in `src/lib/ai/usage.ts`
- **Prompt injection:** this is the feature that most needs it — the stored content *is* a prompt. Put it in `input` inside `<item_content>…</item_content>` and instruct the model to treat it as text to rewrite, never to obey
- AI endpoints never write to the DB — the route only returns a suggestion; the write happens only on the user's explicit Accept
- Unlike Explain, accepting persists from **view mode**: it calls `updateItem` with the item's existing fields and the new `content`. Prompts render through `MarkdownEditor` (read-only) in `ItemContentSection`, which has no `headerActions` slot today — add one, mirroring `CodeEditor`
- Key the optimizer component on `detail.id` (as `CodeExplainer` is) so one item's suggestion never carries over to another
- Scope: Prompt type only, drawer view mode only. Not in the New Item dialog or edit mode for now
