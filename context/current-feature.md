# Current Feature: UI Layout Fixes

## Status

In Progress

## Goals

- **GitHub sign-up on register:** `/register` gets a GitHub button (same `signInWithGitHub` action) with an "or" divider. Extract a shared `GitHubButton` from `src/components/auth/SignInForm.tsx` and use it in both `SignInForm` and `src/components/auth/RegisterForm.tsx`
- **Sidebar active highlighting** (`src/components/dashboard/AppSidebar.tsx`):
  - Add **Dashboard** and **Favorites** links so those routes have something to highlight
  - Stronger active style. The current `bg-sidebar-accent` is only ~7 lightness points above the sidebar background. Use a left accent bar and/or brighter text
  - Prefix matching (`pathname === href || pathname.startsWith(href + "/")`) so nested routes stay highlighted
- **Favorites page matches the rest of the app:** replace the centred, narrower, monospace list with the left-aligned layout and typography used by the dashboard and the item pages
- **Item drawer readable for code:** widen it on desktop (e.g. `sm:max-w-xl`) and drop the code font to ~13px so lines stop wrapping. Avoid nested scroll where possible
- **Header star icon:** add an `aria-label` and a tooltip ("Favorites")
- **Sidebar "Recent" includes favourited collections:** a favourited collection (React Patterns) is currently missing from Recent, which is not intended. Find the cause and fix it
- **Register placeholder:** change the Name placeholder from "Brad Traversy" to "Jane Doe"

## Notes

- Source: Playwright UI review on 2026-10-20 (desktop 1440×900, mobile 390×844, logged in as the demo user)
- What the review measured on sidebar active state:
  - `/items/*`, `/collections` and `/collections/[id]` already set `data-active` correctly; the highlight is just too faint
  - `/dashboard`, `/favorites`, `/profile` and `/settings` have no matching link
  - `/profile` and `/settings` are reached through `SidebarUserMenu`, so a sidebar highlight for them isn't required
- Optional: the register card looks sparse. The GitHub button helps; a logo or a one-line benefit above the card is a nice-to-have, not required
- Already fine, so don't touch: mobile sidebar slide-in, no horizontal scroll at 390px, dashboard mobile stacking, item card type borders, no console errors
- The Next.js dev overlay briefly showed "10 Issues" once during a Fast Refresh rebuild and didn't come back. Watch for it in Chrome
- UI-only changes, so probably no new unit tests unless a utility is extracted (e.g. an `isActivePath` helper, which would be worth a small test)

## Implementation Notes

- **Recent bug cause:** `getRecentNonFavoriteCollections` deliberately filtered `isFavorite: false` (a design choice from Stats & Sidebar, 2026-06-13). It was removed; the sidebar now calls the existing `getRecentCollections(userId, 5)`, so a starred collection shows in both Favorites and Recent
- **Drawer width cause:** the drawer already asked for `sm:max-w-xl`, but shadcn's sheet sets `data-[side=right]:sm:max-w-sm` / `w-3/4`, which win on specificity. Prefixing the drawer's classes the same way lets tailwind-merge replace them. Code font size is the user's editor preference (Settings), so it was left alone
- **Favorites page:** the monospace, dense list is what `context/features/favorites-spec.md` asked for, so it was kept. Only the container changed (`max-w-4xl` → `max-w-6xl`) so the page lines up with the dashboard
- **Header star:** already had `aria-label="Favorites"` and a `title` tooltip; the review got this wrong, so no change
- **Sidebar:** new `src/lib/nav.ts` (`isActivePath` + `NAV_ACTIVE_CLASS`, a left bar in `sidebar-primary`), tested in `nav.test.ts`. "View all collections" matches exactly, so a collection page lights only its own entry

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
