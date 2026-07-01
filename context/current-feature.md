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
- 2026-06-12: **Dashboard Items** - per context/features/dashboard-items-spec.md: pinned + recent items and stats cards now fetched from Neon via Prisma (getPinnedItems/getRecentItems in src/lib/db/items.ts, getDashboardStats counts in src/lib/db/dashboard.ts, demo-user scope shared via src/lib/db/demo-user.ts), ItemSummary/DashboardStats DTOs, item card border + icon chip tinted from item type, tag badges from DB, pinned section hidden when empty; sidebar still mock
- 2026-06-13: **Stats & Sidebar** - per context/features/stats-sidebar-spec.md: sidebar now fetched from Neon via Prisma — system item types with per-user counts and pluralized name/slug linking to /items/[slug] (getItemTypeNavItems in src/lib/db/items.ts, ItemTypeNavItem DTO, order: Snippets/Prompts/Commands/Notes/Files/Images/Links), favorite + recent collections via shared findCollectionSummaries helper (getFavoriteCollections/getRecentNonFavoriteCollections in src/lib/db/collections.ts), recents show dot tinted by most-used item type, "View all collections" link to /collections, AppSidebar converted to props fed by async force-dynamic dashboard layout; stats were already DB-backed from Dashboard Items, only remaining mock usage is currentUser in sidebar footer
- 2026-06-30: **DB Cold-Start Resilience** - handle Neon compute auto-suspend: Prisma `$allOperations` extension in src/lib/prisma.ts retries only transient connection failures (bare ErrorEvent from Neon WebSocket cold-start, P1001) with exponential backoff (300/600/1200/2400ms, ~4.5s max), real query errors throw immediately; centralized so all src/lib/db queries get it without touching call sites; root src/app/error.tsx graceful boundary with Try-again (reset) for exhausted retries / genuine outage — root level because the dashboard layout itself queries the DB so a boundary can't catch its own layout's errors. Note: editing prisma.ts needs a full dev-server restart (global singleton caches the client across hot reloads)
- 2026-07-01: **Pro Badge in Sidebar** - per context/features/add-pro-badge-sidebar.md: PRO badge next to Pro-only system types (Files, Images) in sidebar type nav; added `isPro: boolean` to ItemTypeNavItem DTO, computed in getItemTypeNavItems from a PRO_TYPE_NAMES set (File/Image, keyed by singular name) co-located with SYSTEM_TYPE_ORDER; AppSidebar renders a subtle shadcn Badge (outline variant, h-4, text-[10px], muted foreground, wide tracking, uppercase "PRO") inline after the type name, count SidebarMenuBadge stays on the right; no new query or schema change — flag rides existing props pipeline
