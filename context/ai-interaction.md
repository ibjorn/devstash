# AI Interaction Guidelines

## Communication

- Be concise and direct
- Explain non-obvious decisions briefly
- Ask before large refactors or architectural changes
- Don't add features not in the project spec
- Never delete files without clarification

## Workflow

This is the common workflow that we will use for every single feature/fix:

1. **Document** - Document the feature in @context/current-feature.md.
2. **Branch** - Create new branch for feature, fix, etc
3. **Implement** - Implement the feature/fix that I create in @context/current-feature.md
4. **Test** - Run `npm run lint`, `npm test` and `npm run build` and fix any errors. Write unit tests for any server action or utility the feature added (see **Testing** below). Do NOT set up or run headless browsers in WSL — they don't reproduce what Windows Chrome shows. For browser verification, start the dev server and hand off to Björn to check visually in Windows Chrome; his tab's console errors are forwarded to the dev server terminal/logs.
5. **Iterate** - Iterate and change things if needed
6. **Commit** - Only after build passes and everything works
7. **Merge** - Merge to main
8. **Delete Branch** - Delete branch after merge
9. **Review** - Review AI-generated code periodically and on demand.
10. Mark as completed in @context/current-feature.md and add to history

Do NOT commit without permission and until the build passes. If build fails, fix the issues first.

## Testing

Unit tests run on **Vitest** in the `node` environment.

- `npm test` runs the suite once; `npm run test:watch` watches.
- **Scope: server-side logic only — server actions (`src/actions/`), utilities (`src/lib/`) and route handlers (`src/app/api/`).** No component tests — there is no jsdom and no Testing Library, and UI is verified visually in Windows Chrome instead.
- Tests are **colocated** next to the code they cover: `src/lib/auth-redirect.ts` → `src/lib/auth-redirect.test.ts`.
- Import from `vitest` explicitly (`import { describe, expect, it, vi } from "vitest"`) — globals are off.
- **Never touch the database or the network.** Mock `@/lib/prisma`, `@/auth`, `@/lib/db/session-user` and `@/lib/rate-limit`. Vitest does not load `.env`, so a test that forgets to mock fails loudly rather than quietly reaching the Neon development branch.
- Use `vi.hoisted()` for anything a `vi.mock` factory closes over, and `vi.resetAllMocks()` in `beforeEach` — `clearAllMocks` leaves implementations behind and they leak into the next test.
- Cover the happy path and the error branches that matter, security guards first: redirect validation, credential checks, token namespacing, ownership. Don't write tests just to write them — if a change has no logic worth asserting, say so instead.

## Branching

We will create a new branch for every feature/fix. Name branch **feature/[feature]** or **fix[fix]**, etc. Ask to delete the branch once merged.

## Commits

- Ask before committing (don't auto-commit)
- Use conventional commit messages (feat:, fix:, chore:, etc.)
- Keep commits focused (one feature/fix per commit)
- Never put "Generated With Claude" in the commit messages

## When Stuck

- If something isn't working after 2-3 attempts, stop and explain the issue
- Don't keep trying random fixes
- Ask for clarification if requirements are unclear

## Code Changes

- Make minimal changes to accomplish the task
- Don't refactor unrelated code unless asked
- Don't add "nice to have" features
- Preserve existing patterns in the codebase

## Code Review

Review AI-generated code periodically, especially for:

- Security (auth checks, input validation)
- Performance (unnecessary re-renders, N+1 queries)
- Logic errors (edge cases)
- Patterns (matches existing codebase?)
