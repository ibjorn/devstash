# DevStash

A developer knowledge hub for snippets, commands, prompts, notes, files, images, links and custom types.

## Context Files

Read the following to get the full context of the project:

- @context/project-overview.md
- @context/coding-standards.md
- @context/ai-interaction.md
- @context/current-feature.md

## Neon MCP

When using any Neon MCP tool (`mcp__neon__*`):

- **Always target the `devstash` project** — never another project, even if others exist in the account. If a tool needs a project ID, resolve it by listing projects and matching the name `devstash`; do not guess.
- **Always use the `development` branch** for all queries, migrations, and schema inspection.
- **NEVER touch the production/default branch — no reads, writes, migrations, or anything else — unless Björn explicitly says "production" for that specific action.** A general instruction like "run the migration" always means development. When production is explicitly requested, restate what will run against prod and confirm before executing.
- Sanity anchor: the development branch's endpoint is `ep-withered-thunder-ahswdzxt` (same endpoint as `DATABASE_URL` in `.env`). If the branch you resolved has a different endpoint ID, stop and ask before running anything.
- Schema changes still go through `prisma migrate` (see coding standards) — the MCP is for inspection and queries, not ad-hoc DDL.

## Commands

- `npm run dev` — start the Next.js dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint via flat config (`eslint.config.mjs`)

### Database

Schema changes go through `prisma migrate` — never `db push` (see coding standards).

- `npm run db:migrate` — create + apply a migration in dev (`prisma migrate dev`)
- `npm run db:deploy` — apply pending migrations in production (`prisma migrate deploy`)
- `npm run db:status` — check migrations are in sync; run before committing
- `npm run db:validate` — validate `schema.prisma`
- `npm run db:generate` — regenerate the Prisma client (also runs on `postinstall`)
- `npm run db:seed` — seed the demo user, system item types and demo content.
  **Required for a fresh environment** — the dashboard queries the DB on render,
  so an un-seeded database errors the page.
- `npm run db:studio` — open Prisma Studio
- `npm run db:test` — connection + demo-data smoke test (`scripts/test-db.ts`)
