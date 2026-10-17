# AI Auto-Tagging

## Overview

Add AI-powered tag suggestions for items using the OpenAI `gpt-6-luna` model. Users click a "Suggest Tags" button in the tags area, and the AI returns 3-5 freeform tag suggestions based on the item's title and content. Each suggestion has accept/reject controls. Pro-only feature with both UI-level and server-side gating. If this is the first AI feature implemented, it also establishes the OpenAI foundation (client, shared route guard, rate limit config) for subsequent AI features.

## Requirements

- Create the lazy OpenAI client utility (`src/lib/openai.ts`: `getOpenAI()` + `aiModel()`) and the `OPENAI_MODEL` env var, default `gpt-6-luna` (if not already created by a prior AI feature). Never hard-code the model id at a call site
- Use the standard openai SDK and keep it simple
- Create a `POST /api/ai/tags` Route Handler (`src/app/api/ai/tags/route.ts`), **not** a Server Action: Next.js runs a client's Server Actions one at a time, so Save / ⭐ / 📌 would queue behind the AI call (plan §3). Use `src/app/api/items/upload/route.ts` as the template
- Guard order (shared `src/lib/ai/guard.ts`): `auth()` → `parseJsonBody` with Zod schema → Pro gate (`checkProFeature`, 403 with `upgrade: true`) → rate limit (429 with `Retry-After`). Returns `{ success, data: { tags }, error, upgrade }`
- Request carries the form draft, not an `itemId` (`typeName`, `title`, `content`, `language`, `existingTags`; schema in `src/lib/validation/ai.ts`), so it works before an item exists. The endpoint never writes to the DB
- Add `ai: { limit: 30, window: "10 m" }` to `RATE_LIMITS` in `src/lib/rate-limit.ts`, one bucket shared by all AI features (if not already added). It must **fail closed**: add a `failClosed` option to `checkRateLimit` (plan §5)
- `failClosed` has **no environment exception** (no `NODE_ENV` relaxation): it is the only per-user spend ceiling, so nothing may quietly disable it. Local dev uses the Upstash vars already in `.env`. When it blocks for lack of a limiter, log a clear server-side reason ("AI unavailable: rate limiter not configured") and return the generic 503 to the client
- Note in `.env.example` (next to the Upstash vars) that AI features require them and are disabled without them
- Add "Suggest Tags" button (Sparkles icon, ghost variant) near the tags input in create item dialog and item drawer edit mode
- Display suggested tags as badges with accept (check) and reject (X) controls per tag
- Accepted tags get added to the item's tag list
- Tags are freeform (not limited to existing tags in the database)
- Truncate content to 8,000 chars server-side (don't reject longer input) and tell the model when it was truncated
- Hide the Suggest Tags button for free users (Pro-only UI gating)
- Error handling via toast (Pro gating, rate limit, AI service errors)
- Follow existing patterns
- Unit tests for the route handler, the guard and the `failClosed` rate-limit branch

## OpenAI SDK & `gpt-6-luna` notes

`gpt-5-nano` is **not** used: its snapshot shuts down on 2026-12-11. See `docs/ai-integration-plan.md` §1. The nano-specific workarounds (empty Chat Completions output, avoiding structured outputs, handling two JSON shapes) don't apply to `gpt-6-luna`.

### Use the Responses API with structured output

`gpt-6-luna` supports both APIs, but use the **Responses API** for consistency across AI features, with `responses.parse` + `zodTextFormat` so the JSON shape is guaranteed:

```typescript
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';

const TagSuggestions = z.object({ tags: z.array(z.string()).max(5) });

const response = await getOpenAI().responses.parse({
  model: aiModel(),                       // OPENAI_MODEL, default 'gpt-6-luna'
  instructions: TAG_INSTRUCTIONS,         // static: keep it first, it's the cacheable prefix
  input: buildTagInput(item),             // dynamic: title/type/content
  reasoning: { effort: 'none' },          // tagging is trivial; no reasoning tokens needed
  max_output_tokens: 200,
  text: { format: zodTextFormat(TagSuggestions, 'tag_suggestions') },
  store: false,
});
const parsed = response.output_parsed;    // typed, or null on refusal/incomplete
```

### Gotchas

- `max_output_tokens` counts reasoning tokens too. Keep `reasoning.effort: 'none'` for tags; a higher effort makes truncation at 200 tokens likely
- Treat `output_parsed === null`, `status: 'incomplete'` (e.g. `incomplete_details.reason === 'max_output_tokens'`) or a refusal as an error, never show a partial result
- Structured output guarantees the shape, not the content: still run tags through `normalizeTags` and the `TAG_MAX` / `TAGS_MAX` limits from `src/lib/validation/items.ts` (that also handles lowercasing)
- Never pass OpenAI's error message to the client; map SDK errors to our own messages (plan §5)
- Unit tests mock `@/lib/openai`, like `@/lib/r2`

## Notes

- `OPENAI_API_KEY` already in `.env`
- `isPro` is available server-side via session but not passed to create/edit UI components — use server-side gating for enforcement, UI gating for button visibility requires passing `isPro` as a prop or fetching it client-side
- See `docs/ai-integration-plan.md` for full architectural context
