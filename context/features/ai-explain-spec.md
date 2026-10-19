# AI Explain Code

## Overview

Add AI-powered code explanation for snippets and commands in the item drawer using the OpenAI `gpt-6-luna` model (id via `aiModel()` / `OPENAI_MODEL`, never hard-coded). These are the two item types where explanation adds value — actual code and terminal commands. Other types (prompts, notes, links, files, images) are already human-readable or non-code. Pro-only feature. Explanation displays inline via a tab interface in the code editor, not as a separate panel.

## Requirements

- Create a `POST /api/ai/explain` Route Handler (not a Server Action — a client's actions run one at a time, and actions can't stream; plan §3) with auth, Zod validation, Pro gating and the shared fail-closed `ai` rate limit via `guardAiRequest`
- Stream the explanation as `text/plain`; refusals and errors before the first token come back as JSON. Reasoning effort `low`, `max_output_tokens` 2,000, content truncated to 40,000 chars. A stream that runs out of tokens or fails errors out, and the client drops the partial text
- Add "Explain" button (Sparkles icon) to code editor window controls header (next to Copy button)
- Only show for snippet and command types in the item drawer (not in create/edit forms)
- After generating, show Code/Explain tabs in the editor header to toggle between views
- Render explanation as markdown in the same container space as the code editor
- Explanation should be concise (~200-300 words) covering what the code does and key concepts
- Loading state: Loader2 spinner until the first text arrives; a Stop button while streaming (aborts the fetch and the upstream call), and Regenerate once done. Closing the drawer aborts too
- Pro gating in UI: show Crown icon + tooltip ("AI features require Pro subscription") for free users
- Error handling via toast (Pro gating, rate limit, AI service errors)
- Follow existing patterns
- Unit tests for the route handler

## Notes

- Explanations are not saved to the database — regenerated on each click
- Not available in create/edit forms, only in the item drawer read view
- `isPro` needs to be passed as a prop to the item drawer / code editor
- See `docs/ai-integration-plan.md` for full architectural context
