# Homepage

## Overview

Replace the placeholder `src/app/page.tsx` (`<h1>Devstash</h1>`) with the real marketing homepage, ported from the static mockup in `prototypes/homepage/` (`index.html`, `styles.css`, `script.js`). Same sections, copy, layout and animations, rebuilt in the app's stack. The mockup stays where it is as the reference.

## Requirements

- Port every mockup section: fixed nav, hero (headline, CTAs, chaos → arrow → dashboard visual), features (6 cards), AI section, pricing with monthly/yearly toggle, CTA, footer
- Server components by default; `"use client"` only where the mockup has interactivity (see Components)
- Tailwind v4 + shadcn (`Button`/`buttonVariants`, `Card`, `Badge`) like the rest of the app; no `styles.css` port, no CSS modules, no inline styles except per-item colour values (the same exception `ItemRow` uses for type colours)
- Any keyframes the mockup needs (arrow pulse, tag pop-in, reveal fade) go in `src/app/globals.css`, not a new stylesheet
- Dark theme only, matching the app (`dark` is already hardcoded on `<html>`); Geist fonts from the root layout, not the mockup's Inter/JetBrains Mono
- Item type colours and icons are the app's system ones (as the mockup already uses): reuse `typeIcons` from `src/lib/type-icons.ts`; the colours live only in `prisma/seed.ts` today, so extract them to one shared constant that the seed and the homepage both import rather than restating the hex values
- Repeated markup is data-driven: features, pricing tiers, footer columns, nav links and the dashboard preview cards are arrays mapped to one component each
- Page is public — do **not** add `/` to the proxy matcher
- `metadata` (title + description) taken from the mockup's `<head>`

## Components

`src/components/homepage/`:

| Component | Type | Notes |
|---|---|---|
| `HomeNav` | client | Opacity change past 16px of scroll is the only client logic; logo + links can be passed in from the server |
| `Hero` | server | Headline, subheadline, CTAs; composes the three visual pieces |
| `ChaosAnimation` | client | requestAnimationFrame loop: drift, wall bounce, rotation, scale pulse, cursor repel (110px radius, capped speed, friction, never stalls). Starts from the CSS scatter so nothing jumps on hydration. Pauses when off-screen (IntersectionObserver) or tab hidden; cleans up on unmount |
| `DashboardPreview` | server | Mini sidebar with all seven types + six cards with type-coloured top borders |
| `FeatureCard` / `FeaturesSection` | server | Six cards from a config array |
| `AiSection` | server | Pro badge, checklist, static editor mockup + AI tags |
| `PricingSection` | server | Shell + Free card; renders the toggle island |
| `PricingToggle` | client | Monthly/Yearly `aria-pressed` buttons swapping Pro price ($8/month ↔ $72/year, "Just $6 a month") |
| `Reveal` | client | Small wrapper adding the fade-in on scroll; used around sections instead of a global script |
| `CtaSection`, `HomeFooter` | server | Footer year from `new Date().getFullYear()` on the server |
| `Logo` | server | Shared logo mark + wordmark (nav and footer) |

Brand icons for the chaos box (Notion, GitHub, Slack, VS Code) are inline SVG components — lucide v1 has no brand icons. Reuse `src/components/auth/GitHubIcon.tsx` for GitHub.

## Links

| Element | Destination |
|---|---|
| Logo | `/` (`#top` on the homepage itself) |
| Nav Features / Pricing, footer equivalents | `#features` / `#pricing` (smooth scroll, with `scroll-margin-top` so the fixed nav doesn't cover headings) |
| Sign In | `/sign-in` |
| Get Started, hero CTA, Free "Get started", CTA button | `/register` |
| Hero secondary CTA | `#features` |
| Pro "Go Pro" | `/register` (Stripe isn't built; revisit with billing) |
| Footer Sign in / Register / Reset password | `/sign-in`, `/register`, `/forgot-password` |
| Footer Docs / Changelog / Support | **Remove** — they're `href="#"` in the mockup and have no destinations |

Use Next `<Link>` for routes and plain `<a>` for in-page anchors.

**Signed-in visitors:** the page calls `auth()` and, when there's a session, the nav's Sign In / Get Started become a single "Dashboard" button to `/dashboard` and the hero/CTA buttons point there too. No redirect away from `/` — a signed-in user can still read the marketing page.

## Accessibility & motion

- `prefers-reduced-motion`: chaos icons frozen in the scatter, no arrow pulse, reveals and tag animation shown immediately — including when the setting changes live (listen to the media query)
- Progressive enhancement: content must be visible and readable before hydration/without JS — `Reveal` only hides content once mounted
- Chaos and editor visuals are decorative: `aria-hidden` / `role="img"` with a label, as in the mockup

## Responsive

Desktop-first; at mobile widths the hero visual stacks vertically with the arrow rotated 90°, grids go single-column, and nav links + Sign In hide (Get Started stays), matching the mockup's 760px breakpoint (use Tailwind's `md:`).

## Out of scope

Stripe / real Pro checkout, a docs/changelog/support page, light mode, any DB query on the homepage.

## Testing

No new unit tests expected (presentational components only). If the shared type-colour constant gains logic, test it. lint + test + build; Björn verifies visually in Windows Chrome against the prototype side by side.
