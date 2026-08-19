# Email Verification on Register

Registration currently creates a usable account from an unproven email address.
This feature makes the user prove they own the address by clicking a link we
email them via Resend, and blocks sign-in until they do.

This closes the hole the OAuth account-linking fix worked around: that fix gates
GitHub↔password linking on `User.emailVerified`, but nothing sets it, so the
gate always denies and Björn has to run `UPDATE "User" SET "emailVerified" = now()`
by hand. Once verification ships, the gate passes on its own.

## Goals

- Registration issues a single-use verification token and emails a link via Resend
- Clicking the link sets `User.emailVerified` and lands the user on sign-in with a success toast
- Credentials sign-in is refused while `emailVerified` is null, with copy that says why
- Unverified users can request a fresh email without support intervention
- GitHub sign-in only ever accepts an email GitHub says is **primary and verified**
- Seeded demo user and existing dev rows still sign in after the gate lands

## Scope

### 1. Token storage — `VerificationToken`

Reuse the existing `VerificationToken` model (`identifier` / `token` / `expires`)
from Database Setup. No schema change. The Email provider isn't in use, so the
table is ours.

- `identifier` = the user's email (lowercased, same normalisation as `registerSchema`)
- `token` = **SHA-256 hash** of the raw token, not the raw token — a DB read
  shouldn't let anyone verify someone else's address
- Raw token = 32 random bytes, base64url, generated with `crypto.randomBytes`
- `expires` = now + 24h

New `src/lib/auth/verification-token.ts`:

- `createVerificationToken(email)` — deletes any existing tokens for that
  identifier, inserts a fresh one, returns the **raw** token
- `consumeVerificationToken(rawToken)` — hashes, looks up, deletes, returns the
  identifier or null; treats expired as invalid (and still deletes)
- `getTokenIssuedAt(expires)` — `expires - TOKEN_TTL`, used for the resend cooldown

### 2. Email sending — Resend

Add the `resend` dependency. New `src/lib/email/resend.ts`:

- Module-level `new Resend(process.env.RESEND_API_KEY)` client
- `sendEmail({ to, subject, html })` wrapper. `resend.emails.send` returns
  `{ data, error }` and does **not** throw on API errors — check `error`
  explicitly and return the project's `{ success, error }` shape
- Pass an `idempotencyKey` (`verify-email/${userId}`) so a double-submit doesn't
  double-send

New `src/lib/email/templates.ts` — a plain function returning an HTML string for
the verification email (heading, one-line explanation, a button-styled anchor,
the raw URL as fallback text, "expires in 24 hours", "ignore this if it wasn't
you"). **Do not** add React Email — it's a whole toolchain for one email.

New env vars (both need adding to `.env` and `.env.example`; `RESEND_API_KEY` is
already in both):

- `EMAIL_FROM` — e.g. `DevStash <noreply@yourdomain.com>`
- `APP_URL` — `http://localhost:3000` in dev; used to build absolute links in
  the email. Don't derive it from request headers.

### 3. Register route

`src/app/api/auth/register/route.ts`, after the user is created:

- Issue a token and send the email
- **A send failure must not roll back the account.** Log it, still return 201,
  and let the user fall back to the resend flow. A user who exists but got no
  email is recoverable; a 500 that leaves an orphan row is not.
- Response message changes to tell the user to check their inbox

`RegisterForm` toast copy changes from "Sign in with your new credentials" to
"Check your email to verify your account". It still routes to `/sign-in`.

### 4. Verify route

`GET /api/auth/verify?token=…` (route handler, redirects):

| Outcome | Redirect |
|---|---|
| Valid token | mark `emailVerified = now()`, → `/sign-in?verified=1` |
| Token unknown/expired **and** that email is already verified | → `/sign-in?verified=already` |
| Token unknown/expired otherwise | → `/sign-in?error=VerificationInvalid` |

The "already verified" branch matters: corporate link scanners (Outlook Safe
Links and friends) will GET the URL before the human does and burn the token.
Landing the real user on a friendly "already verified" instead of an error
absorbs that case without needing a POST-behind-a-button interstitial.

Sign-in page maps the new codes to copy alongside the existing `ERROR_MESSAGES`
table, and `SignInForm` toasts `?verified=` the same way it already toasts
`?error=` (fixed toast id, then `history.replaceState` to strip it).

### 5. Resend verification

`POST /api/auth/verify/resend` — body `{ email }`.

- **Always returns 200 with the same message**, whether or not the account
  exists or is already verified. No enumeration oracle.
- Cooldown: if an unexpired token exists and was issued less than 5 minutes ago
  (`expires - 24h`), don't send again — still return the same 200. This is the
  only throttle; there's still no general rate limiter in the project.

Surfaced from the sign-in page when `?error=EmailNotVerified` — a "Resend
verification email" button under the form.

### 6. Sign-in gate

In `src/auth.ts`, the credentials `authorize`: after the bcrypt compare passes,
if `user.emailVerified` is null, refuse with a **distinct** error code
(`EmailNotVerified`) rather than a bare `null`.

- Ordering is deliberate — the unverified branch is only reachable with a
  correct password, so it isn't an enumeration leak. Keep the existing bare
  `null` for unknown email / OAuth-only / wrong password.
- Auth.js v5 surfaces custom credentials failures by subclassing
  `CredentialsSignin` and setting `code`. **The exact query-string shape has
  moved across the v5 betas — verify against the installed
  `next-auth@5.0.0-beta.32` source before relying on it**, and fall back to a
  plain `CredentialsSignin` with generic copy if it can't carry the code.

GitHub sign-in is **not** gated on `emailVerified` — GitHub is the proof (see
below), and the `signIn` callback already handles the linking case.

### 7. GitHub email must be primary + verified

`@auth/core/providers/github.js` picks the email as
`(emails.find(e => e.primary) ?? emails[0]).email` with no `verified` check, and
only falls back to `/user/emails` at all when `/user` returned no public email —
which itself isn't guaranteed verified. The `signIn` linking gate trusts that
email more than GitHub actually guarantees.

**Correction to the earlier note:** overriding `profile()` is not enough. By the
time `profile()` runs, the address has already been chosen and the `verified`
flag is gone. The fix has to override `userinfo.request` in
`GitHub({ … })` in `src/auth.config.ts`:

- Always fetch `/user/emails` (the default scope is already
  `read:user user:email`, so no OAuth app change)
- Take `emails.find(e => e.primary && e.verified)`; **no `?? emails[0]` fallback**
- If there's no primary-and-verified address, leave `profile.email` unset and
  let the sign-in fail rather than guessing

### 8. Seed + existing rows

`prisma/seed.ts` sets `emailVerified` on the demo user, otherwise
`demo@devstash.io / 12345678` stops working the moment the gate lands.

Dev-branch leftovers (`test@test.com`, `padded@test.com`, `test@tester.test`,
`jane@test.test`) are unverified and will be locked out — fine, but worth
clearing out as housekeeping. Björn's own production row still needs its manual
`emailVerified` update, or a fresh verification email.

## Out of scope

- Password reset (same token machinery, different feature)
- Letting a GitHub-first user add a password — register still 409s (open since Phase 2)
- A general rate limiter on the public auth endpoints (open since Phase 2)
- Dummy bcrypt compare for the timing side-channel (open since Phase 2)
- Changing session strategy, or verifying emails on address *change* (no
  profile-edit UI exists yet)

## Operational notes

- **Resend sandbox:** without a verified domain, Resend only lets
  `onboarding@resend.dev` send to the account owner's own address. Registering a
  test account with any other address will silently not deliver until a domain
  is verified in the Resend dashboard. Plan to test with Björn's own address, or
  verify a domain first.
- `resend.emails.send` returns `{ data, error }` — it does not throw. Missing the
  `error` check is the easy way to ship a silent no-op.
- Email HTML: inline styles only, table-free simple layout, and always include
  the raw URL as text — some clients strip anchors.

## Testing

Per project workflow: `npm run lint` + `npm run build`, then curl against the dev
server. No headless browser in WSL.

- Register → 201, `VerificationToken` row exists, hashed (raw token not in DB)
- Sign-in with the new account → refused with the `EmailNotVerified` path
- GET the verify link → 302 to `/sign-in?verified=1`, `emailVerified` set, token row gone
- GET the same link again → `/sign-in?verified=already`
- Sign in again → succeeds, session carries `user.id`
- Tampered / expired token → `/sign-in?error=VerificationInvalid`
- Resend: unknown email, known-unverified, already-verified → all identical 200s
- Resend twice inside 5 minutes → second sends no email
- Demo user still signs in after reseed
- Existing checks still pass: signed-out `/dashboard` 307s, GitHub entry point
  302s to github.com, `/api/auth/providers` lists both

**Left to Björn in Windows Chrome:** the real GitHub round-trip (including the
primary+verified override), actual email delivery and rendering, and every toast.
