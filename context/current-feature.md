# Current Feature

**Seed Data** - Seed script to populate the database with sample data for development and demos.

## Status

Not Started

## Goals

Implement the seed script as specified in @context/features/seed-spec.md:

- Demo user (demo@devstash.io, bcryptjs-hashed password, not Pro, email verified)
- All 7 system item types (snippet, prompt, command, note, file, image, link)
- 5 collections with items: React Patterns (3 snippets), AI Workflows (3 prompts), DevOps (1 snippet, 1 command, 2 links), Terminal Commands (4 commands), Design Resources (4 links)
- Links use real URLs

## Notes

- Overwrite the existing seed file (`prisma/seed.ts`) — replace the current system-type-only seed entirely

## History

- 2026-05-12: **Initial Setup** - Next.js and Tailwind setup
- 2026-06-12: **Dashboard UI Phase 1** - shadcn/ui init + button/input components, /dashboard route with layout shell (sidebar/main placeholders), display-only top bar (search + New Item), dark mode by default
- 2026-06-12: **Dashboard UI Phase 2** - collapsible sidebar (shadcn sidebar + avatar) with item type links to /items/[slug], favorite + recent collections, user avatar footer, top bar drawer trigger, icon rail on desktop, sheet drawer on mobile
- 2026-06-12: **Dashboard UI Phase 3** - main dashboard area from mock data: 4 stats cards (items, collections, favorite items/collections), collections grid with type-tinted cards, pinned items, 10 recent items; shadcn card + badge added, shared type-icons helper extracted to src/lib
- 2026-06-12: **Database Setup** - Prisma 7 + Neon PostgreSQL: full schema (data models + NextAuth), prisma.config.ts with dotenv, init migration applied to Neon dev branch, system item type seed, client singleton with Neon driver adapter, db:* npm scripts, scripts/test-db.ts smoke test
