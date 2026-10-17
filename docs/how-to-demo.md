# How to Demo DevStash

How to put DevStash on Vercel as a hosted **test-mode** demo, and how to walk someone
through it.

> **This is not a launch.** Paystack stays in **test mode** throughout: the same
> `sk_test_…` key and plans as local dev, test cards only. Nobody can be charged.
> "Production" below means Vercel's production deployment and the Neon default
> branch, not real money. Going live for real is covered in Part 3 of
> [paystack-integration-plan.md](paystack-integration-plan.md).

---

## 1. Decisions

| Decision | Choice | Why |
|---|---|---|
| Database | Neon **default (production) branch** | Keeps local experiments on `development` out of the demo |
| URL | Vercel's **production domain** only (`devstash-<something>.vercel.app`) | `APP_URL`, the GitHub callback, the Paystack webhook and R2 CORS all name one exact origin. Preview URLs break all four |
| Email verification | `SKIP_EMAIL_VERIFICATION=true` | Resend has no verified domain, so it can only email the account owner |
| Gating | `BILLING_ENFORCED=true` | Shows the Free-tier wall and the upgrade flow, which is the point of the demo |
| GitHub sign-in | Optional, needs a **second** OAuth app | A GitHub OAuth app allows only one callback URL, and the existing one is `localhost` |
| Rate limiting | Optional (Upstash) | Without it the limits fail open. Fine for a demo |

---

## 2. Setup

Do these in order. **Steps 4 and 5 touch the production Neon branch.** Claude runs
them only when Björn says "production" for that action, after showing the exact
command.

### Step 1: Push `main`

Vercel deploys from GitHub, so `main` must be pushed first.

### Step 2: Create the Vercel project

1. Vercel → **Add New → Project** → import `ibjorn/devstash`. The framework is
   detected as Next.js; leave the build settings as they are. `postinstall` already
   runs `prisma generate`.
2. Let the first deploy run. It fails or errors at runtime without env vars, which is
   expected.
3. Note the **production domain** under Settings → Domains. Everything below uses it
   as `<domain>`.

### Step 3: Environment variables

Vercel → Settings → Environment Variables, scope **Production**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon default branch, **pooled** connection (`-pooler` host) |
| `DIRECT_URL` | Neon default branch, **direct** connection |
| `AUTH_SECRET` | A **new** one: `npx auth secret`. Don't reuse the local secret |
| `APP_URL` | `https://<domain>`, no trailing slash. Builds the Paystack `callback_url` and email links |
| `SKIP_EMAIL_VERIFICATION` | `true` |
| `BILLING_ENFORCED` | `true` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME` | Same as `.env` |
| `PAYSTACK_SECRET_KEY` | Same `sk_test_…` as `.env` |
| `PAYSTACK_PLAN_CODE_MONTHLY`, `PAYSTACK_PLAN_CODE_YEARLY` | Same as `.env`: one test account means the same plans |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | *Optional.* From a new GitHub OAuth app with callback `https://<domain>/api/auth/callback/github` |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | *Optional* |
| `RESEND_API_KEY`, `EMAIL_FROM` | *Optional.* Unused while verification is skipped |

Don't set `AUTH_URL`: NextAuth v5 reads the host from Vercel's own variables.

### Step 4: Migrate the production branch ⚠️ production

From the repo, in one terminal session, with the **default branch's** connection
strings exported. They override `.env`, because `dotenv` never replaces a variable
that's already set:

```bash
export DIRECT_URL='postgresql://…default-branch direct…'
export DATABASE_URL='postgresql://…default-branch pooled…'

npm run db:status   # sanity check, see below
npm run db:deploy   # prisma migrate deploy: applies every pending migration
```

**Sanity check before `db:deploy`:** the host `db:status` prints must **not** be
`ep-withered-thunder-ahswdzxt`. That's the development branch. If it is, the exports
didn't take; stop.

### Step 5: Seed the production branch ⚠️ production

Same terminal, same exports:

```bash
npm run db:seed
```

This creates the system item types and the demo user. The dashboard errors on load
without them. It's safe to re-run: it only resets the demo user's own items and
collections.

Close the terminal afterwards, so the production connection strings don't leak into
the next command.

### Step 6: Paystack and R2

- **Paystack** → Settings → API Keys & Webhooks (**Test** mode) → Test Webhook URL:
  `https://<domain>/api/webhooks/paystack`.
  Paystack holds one webhook URL per mode, so **local dev stops receiving webhooks**.
  That's harmless: the checkout callback covers upgrades, and the 24-hour expiry covers
  missed cancellations. A webhook for a local-only user matches no row on Vercel and
  is ignored.
- **Cloudflare R2** → the bucket → Settings → CORS policy: add `https://<domain>` to
  `AllowedOrigins` next to `http://localhost:3000`. Methods `PUT`, header
  `content-type`. Without it, uploads fail in the browser with a CORS error.

### Step 7: Redeploy and smoke test

Env vars only apply to new deployments: Vercel → Deployments → latest → **Redeploy**.
Then go through the demo script below once yourself.

---

## 3. Demo script

About 10 minutes. The story: *Free tier → hit the wall → pay → unlocked → manage.*

**Before the meeting**
- Open `<domain>` 5 minutes early. Neon pauses an idle database, and the first request
  after a pause is slow or can fail once. Reload if it does.
- If rehearsal left the demo account messy, re-run Step 5. That's a production action
  again.
- Have the Paystack dashboard open in another tab, in **Test** mode.

**The walkthrough**

1. **Homepage** at `/`: the pitch, features and Free/Pro pricing with the approximate
   USD figure.
2. **Register a fresh account.** Verification is skipped, so it signs straight in.
   Use a throwaway address; you'll delete the account at the end.
3. **Free tier:** New Item shows File and Image **locked**. Settings → Billing shows
   the usage counter.
4. **Hit the wall:** create collections until the 4th one is refused with an upgrade
   prompt.
5. **Upgrade:** the **Upgrade** button in the header (or clicking Files / Images in
   the sidebar) opens `/upgrade` → monthly or yearly → Paystack checkout. Pay with
   Paystack's test card: `4084 0840 8408 4081`, CVV `408`, any future expiry. If asked,
   PIN `0000` and OTP `123456`. If those are refused, check Paystack's docs under
   "Test payments".
6. **Unlocked:** back in the app the plan is Pro, the collection goes through, and
   File/Image are available. Upload an image.
7. **Behind the scenes (optional):** Paystack dashboard → Webhooks log shows the
   `charge.success` / `subscription.create` deliveries with 200s.
8. **Manage:** Settings → Billing → Manage subscription (Paystack's hosted page) →
   cancel. Back in Settings the plan shows cancelled, with Pro until the period ends
   and no further charges. Paystack's own page is a dead end once cancelled, so the
   way back is in the app: **Resubscribe monthly / yearly** starts a new subscription
   on the same card, first charged when the current period ends.
9. **Clean exit:** Settings → Delete account. Pro users are warned the subscription
   is cancelled.
10. **A stocked account:** sign in as `demo@devstash.io` / `12345678` to show
    collections, search, the item drawer and the editors.

**Points worth making to a team lead**
- Paystack instead of Stripe because Stripe isn't available in South Africa. Billing is
  in ZAR, and USD is only shown as an approximation.
- Webhooks are verified (HMAC-SHA512) and every billing write is an absolute set, so
  retries and duplicate deliveries are harmless.
- Access doesn't rely on webhooks alone: missed cancellations expire after a 24-hour
  grace.
- Limits are enforced server-side, not just hidden in the UI.

---

## 4. Afterwards

- **Pause it:** unset `BILLING_ENFORCED` (and redeploy) to lift the Free limits, or
  delete the Vercel project. Neither touches local dev.
- **Webhook back to local:** to test webhooks locally again, point the Paystack test
  webhook at a tunnel, then switch it back to `<domain>` before the next demo.
- **Never** swap in live keys here. This deployment is a test-mode demo by design.
