# Current Feature

<!-- Feature name and short description -->

## Status

<!-- Not Started | In Progress | Completed -->

## Goals

<!-- Goals & requirements -->

## Notes

<!-- Any extra notes -->

## History

- 2026-05-12: **Initial Setup** - Next.js and Tailwind setup
- 2026-06-12: **Dashboard UI Phase 1** - shadcn/ui init + button/input components, /dashboard route with layout shell (sidebar/main placeholders), display-only top bar (search + New Item), dark mode by default
- 2026-06-12: **Dashboard UI Phase 2** - collapsible sidebar (shadcn sidebar + avatar) with item type links to /items/[slug], favorite + recent collections, user avatar footer, top bar drawer trigger, icon rail on desktop, sheet drawer on mobile
- 2026-06-12: **Dashboard UI Phase 3** - main dashboard area from mock data: 4 stats cards (items, collections, favorite items/collections), collections grid with type-tinted cards, pinned items, 10 recent items; shadcn card + badge added, shared type-icons helper extracted to src/lib
- 2026-06-12: **Database Setup** - Prisma 7 + Neon PostgreSQL: full schema (data models + NextAuth), prisma.config.ts with dotenv, init migration applied to Neon dev branch, system item type seed, client singleton with Neon driver adapter, db:* npm scripts, scripts/test-db.ts smoke test
- 2026-06-12: **Seed Data** - per context/features/seed-spec.md: User.password migration (nullable, bcrypt hash), seed rewritten with demo user (demo@devstash.io, bcryptjs 12 rounds) + 7 system types + 5 collections with 18 items (real URLs for links), idempotent reseed (upsert user, wipe + recreate their data), smoke test extended to display demo data and verify password hash
- 2026-06-12: **Dashboard Collections** - per context/features/dashboard-collections-spec.md: dashboard collections grid now fetched from Neon via Prisma (getRecentCollections in src/lib/db/collections.ts, scoped to demo user until auth), CollectionSummary DTOs in src/types/collections.ts, card tint + border from most-used item type with defaultTypeId fallback for empty collections, type icons ordered by usage, real item counts, dashboard page async + force-dynamic; pinned/recent items still mock
