# Current Feature: Paystack Billing (Pro Subscriptions)

## Status

In Progress

## Goals

- Pro subscriptions through Paystack (Stripe isn't available in South Africa), billed in ZAR: **R135/month**, **R1,200/year**
- Pricing UI shows an approximate USD figure converted daily (Frankfurter / ECB rates), with the rand amount it's billed as; falls back to rand-only if the rate is unavailable
- Redirect checkout via a server action, verified callback route, signature-checked webhook keeping `isPro` and subscription state in sync
- `User` Stripe columns replaced with Paystack ones via `prisma migrate` (dev branch only)
- Billing section on `/settings`: upgrade buttons for Free, status + hosted "Manage subscription" link for Pro
- Pro **gating stays bypassed** — this makes users Pro, it doesn't enforce limits

## Notes

- Full spec: context/features/paystack-billing-spec.md
- Webhooks can't reach localhost — the callback route also syncs the subscription so local dev works without a tunnel
- Paystack MCP (`@paystack/mcp-server`) accepts test keys only — handy for creating plans and inspecting test transactions
- Migration drops the Stripe columns and adds the Paystack ones: confirm they're empty on dev and review the generated SQL before applying
- Callback URL builds on the existing `getAppUrl()` helper (`src/lib/email/app-url.ts`)
- Out of scope: enforcing limits, plan switching, dunning/invoices/refunds, live keys and the prod webhook

## History

Completed features are logged in context/feature-history.md (not auto-loaded — read it when you need past context).
