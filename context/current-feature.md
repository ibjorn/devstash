# Current Feature: AI Auto-Tagging

## Status

In Progress

## Goals

- Pro users can click **Suggest Tags** (Sparkles icon, ghost variant) near the tags input in the create item dialog and the item drawer's edit mode, and get 3-5 freeform tag suggestions from `gpt-6-luna` based on the item's title and content
- Each suggestion shows as a badge with accept (check) / reject (X) controls; accepted tags join the item's tag list
- The button is hidden for free users (UI gating, via an `isPro` prop or client fetch), and the server enforces the Pro gate regardless
- Establish the OpenAI foundation (first AI feature): lazy client `src/lib/openai.ts` (`getOpenAI()` + `aiModel()`), `OPENAI_MODEL` env var defaulting to `gpt-6-luna`, never hard-coded at a call site
- `POST /api/ai/tags` Route Handler (not a Server Action, so Save / ⭐ / 📌 don't queue behind the AI call), templated on `src/app/api/items/upload/route.ts`
- Shared guard `src/lib/ai/guard.ts` in order: `auth()` → `parseJsonBody` + Zod → Pro gate (`checkProFeature`, 403 `upgrade: true`) → rate limit (429 + `Retry-After`); response shape `{ success, data: { tags }, error, upgrade }`
- Request carries the form draft (`typeName`, `title`, `content`, `language`, `existingTags`; schema in `src/lib/validation/ai.ts`), works before an item exists, and never writes to the DB
- `ai: { limit: 30, window: "10 m" }` added to `RATE_LIMITS`, one bucket for all AI features, with a new `failClosed` option on `checkRateLimit` that has **no environment exception**; when no limiter is configured, log "AI unavailable: rate limiter not configured" server-side and return a generic 503
- `.env.example` notes (next to the Upstash vars) that AI features require them and are disabled without them
- Content truncated to 8,000 chars server-side (not rejected), and the model is told when it was truncated
- Errors surface via toast: Pro gating, rate limit, AI service errors
- Unit tests for the route handler, the guard and the `failClosed` rate-limit branch

## Notes

- Spec: `context/features/ai-auto-tag-spec.md`; architecture: `docs/ai-integration-plan.md` (§1 model, §3 route vs action, §5 errors / rate limit)
- Spec already targets `gpt-6-luna`; no `gpt-5-nano` leftovers. The plan (§5, ~line 366) leaves the `NODE_ENV` relaxation open; the spec decides it: no relaxation
- Use the standard `openai` SDK, Responses API: `responses.parse` + `zodTextFormat`, `instructions` static (cacheable prefix) first, `input` dynamic, `reasoning: { effort: "none" }`, `max_output_tokens: 200`, `store: false`
- `max_output_tokens` includes reasoning tokens, so keep effort `none`
- Treat `output_parsed === null`, `status: "incomplete"` or a refusal as an error; never show a partial result (plan maps this to 422 "Couldn't suggest anything for this item.")
- Structured output guarantees the shape, not the content: still run results through `normalizeTags` and `TAG_MAX` / `TAGS_MAX` from `src/lib/validation/items.ts` (handles lowercasing)
- Never pass OpenAI's error message to the client; map SDK errors to our own messages
- Tests mock `@/lib/openai` (like `@/lib/r2`), plus `@/lib/prisma`, `@/auth`, `@/lib/rate-limit`
- `OPENAI_API_KEY` is already in `.env`
- `isPro` is available server-side via session but isn't currently passed to the create/edit UI components

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
