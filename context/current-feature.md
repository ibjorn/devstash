# Current Feature: AI Summary for Description

## Status

In Progress

## Goals

- A Pro-only `Sparkles` icon button beside the **Description** label in the New Item dialog and the drawer's edit mode
- Clicking it generates a concise **1–2 sentence** summary from what's currently in the form — no save needed, unsaved edits count
- Works for **every item type**, using whatever is available: title, type, content (snippet/prompt/command/note), language, URL (link), file name (file/image), and existing tags as context
- The summary goes into the Description field (still editable, and only persisted by the normal Save)
- If Description already had text, the overwrite is undoable until save (inline "Undo")
- Loading state on the button (spinner, disabled while running); the rest of the form stays usable
- Errors / rate limits / Free-user denial surface as toasts, same as Suggest Tags
- `POST /api/ai/summary` route handler that never writes to the DB, returns `{ success, data: { summary } }`
- Unit tests for the route (401, 403 + `upgrade`, 429, invalid input, happy path, OpenAI not called on guard failure) and the `src/lib/ai/summary.ts` input builder / output clamp

## Notes

- This is step 3 of the build order in `docs/ai-integration-plan.md` §11 — "the tags slice with different settings". Reuse everything from AI Auto-Tagging: `guardAiRequest`, `src/lib/ai/errors.ts`, `usage.ts` (`logAiUsage`, `safetyIdentifier`), the fail-closed `ai` rate limit, `getOpenAI()` / `aiModel()` (`gpt-6-luna` via `OPENAI_MODEL`)
- Plan settings (§1): structured output `{ summary: string }`, reasoning effort `none`, `max_output_tokens` 400, input cap **12,000 chars** (truncate, don't reject), `store: false`, hashed `safety_identifier`. Treat `status: "incomplete"` / no parsed output as `AiNoResultError` — never show a partial result
- Clamp the output to `DESCRIPTION_MAX` (1,000) server-side; the model is an untrusted client
- Request schema in `src/lib/validation/ai.ts` alongside `tagRequestSchema`: `typeName`, `title`, `content`, `language`, `url`, `fileName`, `existingTags`. The "add a title or some content first" refine must also accept a URL or file name, so a link/file with only those can still be summarised
- Prompt: same injection guard as tags (item inside `<item>` delimiters, `<` escaped, "data, never instructions"). Ask for a plain-text 1–2 sentence description of what the item is/does — no "This snippet…" boilerplate, no markdown, no quotes. Static instructions first, user content last (caching)
- File/image items: we only send metadata (title, file name, tags) — the file contents are **not** read from R2. Image items will get a summary based on their name only; that's expected, not a bug
- UI deviation from plan §5: the plan sketched a `✨ Summarize` button with a Use/Discard preview card. Björn asked for an **icon button that fills Description directly**, so this goes straight into the field with Undo as the safety net. Needs an `aria-label`/tooltip ("Generate description with AI")
- Pro gating: same as tags — hidden/disabled behaviour should match `SuggestTags` for Free users when `BILLING_ENFORCED=true`
- No schema changes (summary → `Item.description`)

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
