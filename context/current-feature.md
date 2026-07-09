# Current Feature

**Audit Quick Wins** — low-risk cleanups from the 2026-07-09 code-scanner audit. Small, mechanical fixes only; no behavior redesigns, no schema changes, no auth prep (auth isn't implemented yet).

## Status

In Progress

## Goals

- **Cap `getPinnedItems`** (`src/lib/db/items.ts:83-91`): only list query without a row limit. Add a `limit` parameter with a sane default, mirroring the `getRecentItems` pattern (`take: limit`).
- **Dedupe the demo email literal**: `"demo@devstash.io"` is defined in three places. Have `prisma/seed.ts:12` and `scripts/test-db.ts:11` import `DEMO_USER_EMAIL` from `src/lib/db/demo-user.ts` instead of redefining `DEMO_EMAIL` locally (both files already import from `../src/generated`, so cross-directory imports are established). Seed's `DEMO_PASSWORD` stays where it is.
- **Extract a type-color tint helper**: the `` `${color}40` `` / `` `${color}1a` `` / `` `${color}0d` `` hex-alpha suffix trick is duplicated in `src/components/dashboard/ItemRow.tsx:25,30` and `src/components/dashboard/CollectionCard.tsx:29-30`, and silently produces invalid CSS if a type color is ever stored as 3-digit hex or `rgb()` (custom types with user-supplied colors are planned). Add a small helper in `src/lib/` (e.g. `type-colors.ts`) using `color-mix(in srgb, <color> N%, transparent)` and use it in both components. AppSidebar's raw `color`/`backgroundColor` usages are full-strength colors, not alpha compositions — leave them alone.
- No visual changes intended — tint strengths must match the current hex-alpha values (`40` ≈ 25%, `1a` ≈ 10%, `0d` ≈ 5%); Björn eyeballs the dashboard to confirm cards/rows look identical.
- `npm run lint` and `npm run build` pass.

## Notes

- Deliberately **excluded** from this feature (from the same audit):
  - Deleting `src/lib/mock-data.ts` — deferred per Björn.
  - `findCollectionSummaries` groupBy rework (Medium perf) — real query restructuring, deserves its own feature with the 50-line-function split.
  - Tag user-scoping schema decision — needs a product call before Item CRUD, not a quick win.
  - Threading `userId` through `src/lib/db/*` and env-gating the seed's demo user — both are Auth-phase prep; do them when auth lands.
  - `AppSidebar` decomposition — optional structural refactor, park it until the footer changes for auth anyway.

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
- 2026-07-09: **Sidebar User from DB** - severed the last live mock-data import: sidebar footer user now fetched from Neon via Prisma (getCurrentUser in new src/lib/db/users.ts, findUniqueOrThrow scoped to DEMO_USER_EMAIL, selects name/email/image only), CurrentUser DTO in new src/types/users.ts with schema-accurate nullability, fetched in dashboard layout's existing Promise.all and passed to AppSidebar via props; initials/display name fall back to email when name is null; zero @/lib/mock-data imports in src/ (file itself deliberately kept, deletion deferred per Björn); note: un-seeded DB now errors the dashboard via root boundary, so db:seed is a hard prerequisite for fresh environments; when NextAuth lands, getCurrentUser swaps the demo-email filter for the session user
