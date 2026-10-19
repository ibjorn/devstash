# Current Feature: AI Explain Code

## Status

In Progress

## Goals

- Pro-only "Explain" for **snippet** and **command** items, in the item drawer **view mode only** (not create/edit forms)
- Explain button (`Sparkles` icon) in the code editor's window-controls header, next to Copy
- After generating, Code / Explain tabs in the editor header toggle between the code and the explanation, rendered as markdown in the same container space
- Concise explanation (~200–300 words): what the code does and the key concepts
- Loading state with a `Loader2` spinner while generating
- Free users see a `Crown` icon + tooltip "AI features require Pro subscription" instead of a working button
- Server side: auth → Zod validation → Pro gate → shared `ai` rate limit; errors (Pro, rate limit, AI service) surface as toasts
- Model `gpt-6-luna` via `aiModel()` / `OPENAI_MODEL`, never hard-coded
- Explanations are never saved; each click regenerates
- `isPro` passed down to the item drawer / code editor
- Unit tests for the `/api/ai/explain` route handler

## Notes

- Spec: `context/features/ai-explain-spec.md` (model converted from `gpt-5-nano` to `gpt-6-luna` on load)
- Architecture: `docs/ai-integration-plan.md`. Reuse the shared AI foundation from Tags/Summary: `src/lib/ai/guard.ts`, `src/lib/ai/errors.ts`, `src/lib/openai.ts`, the fail-closed `ai` rate limit (30 / 10 m)
- Plan settings for explain: reasoning effort `low`, `max_output_tokens` 2,000, input cap 40,000 chars (truncate, don't reject); `store: false`, hashed `safety_identifier`; an `incomplete` response from `max_output_tokens` is an error, not a partial result
- Markdown via `react-markdown` **without `rehype-raw`**; links get `target="_blank"` + `rel="noopener noreferrer"`
- **Spec/plan conflicts, settled at `start`** (spec updated to match):
  1. Transport: `POST /api/ai/explain` Route Handler, not a Server Action
  2. Streaming: yes; Loader2 until the first text arrives, Stop while streaming, Regenerate after
  3. Placement: the spec's Code/Explain tabs in the editor header (not the plan's collapsible section)
  4. Free users: Crown + tooltip, linking to `/upgrade` (Tags/Summary still hide their buttons)

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
