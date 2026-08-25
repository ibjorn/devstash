# Auth Security Review

**Last audited:** 2026-08-25
**Scope:** NextAuth v5 config, credentials + GitHub providers, email verification, password reset, profile page
**Files reviewed:** 52

## Summary

The auth surface is unusually well-documented and, for the most part, well-built: password hashing goes through one shared helper, reset/verification tokens are CSPRNG-generated and stored only as SHA-256 hashes with TTLs enforced at lookup, the two token kinds are provably namespaced apart, redirect targets are validated against an allow-list, and every profile mutation re-derives the acting user from the session rather than trusting client input. The overall posture is solid. The gaps that remain are exactly the ones the team has already been tracking as deferred work — no rate limiting on the public auth endpoints, two timing side-channels that leak account existence, and a JWT session that outlives a password change or reset — plus one new finding from this pass: none of the password schemas cap input length, which combines with bcryptjs's silent 72-byte truncation into a real (if narrow) authentication weakness. Fix priority: (1) rate limit register/forgot/resend/sign-in, (2) close the two timing oracles (dummy-hash compare in `authorize()`, `after()` in the resend route to match the forgot-password fix), (3) cap password length before the next registration ships.

## Findings

### [High] No rate limiting on public auth endpoints
- **File:** `src/app/api/auth/register/route.ts`, `src/app/api/auth/password/forgot/route.ts`, `src/app/api/auth/verify/resend/route.ts`, `src/actions/auth.ts` (`signInWithCredentials`)
- **Issue:** None of these endpoints throttle by IP, account, or any other key. Registration, password-reset requests, verification resends, and credentials sign-in attempts can all be repeated without limit.
- **Exploit:** An attacker scripts repeated `POST /sign-in` (via the `signInWithCredentials` action) against a known email address and brute-forces the password with no lockout or backoff; the same script against `/api/auth/register` or `/api/auth/password/forgot` can spam accounts or inboxes at will.
- **Fix:** Add a rate limiter (e.g. Upstash Redis or an in-memory sliding window behind Vercel's edge) keyed by IP + email on all four surfaces, with a stricter per-account lockout on credentials sign-in.
- **Status:** known / previously deferred

### [High] Timing oracle in credentials `authorize()` reveals whether an account has a password
- **File:** `src/auth.ts:20-39`
- **Issue:** `authorize()` returns `null` immediately for an unknown email or a null (OAuth-only) password hash (line 33) but performs a real `bcrypt.compare` at cost 12 (lines 35-38) when a password hash exists. The two paths are cryptographically far apart in latency even though the response body and status code are identical.
- **Exploit:** An attacker measures response time on repeated `POST /sign-in` submissions for a candidate email; a ~tens-of-milliseconds bcrypt delay versus a near-instant response distinguishes "this address has no password account" from "this address has one," feeding a targeted credential-stuffing list even though the UI shows one generic "Invalid email or password" message either way.
- **Fix:** Perform a dummy `bcrypt.compare` against a fixed hash on every non-match path so the timing is constant regardless of which branch is taken.
- **Status:** known / previously deferred

### [High] Timing oracle in `/api/auth/verify/resend`
- **File:** `src/app/api/auth/verify/resend/route.ts:54-85`
- **Issue:** The unknown-address, already-verified, and OAuth-only branches all return `acknowledge()` almost instantly (line 62). The "genuinely pending" branch instead runs a live `issueVerificationEmail` call (line 74) — a real Resend API round trip — synchronously before responding. The sibling endpoint (`password/forgot`) was fixed for exactly this class of bug by moving the equivalent work into `after()`; this endpoint was not reconciled.
- **Exploit:** An attacker measures response latency on `POST /api/auth/verify/resend` for a candidate address; a multi-hundred-millisecond-to-multi-second delay versus a near-instant one reveals "this account exists and is still unverified," despite the byte-identical response body.
- **Fix:** Wrap the lookup/cooldown/send in Next's `after()`, exactly as `src/app/api/auth/password/forgot/route.ts:56-100` already does, and return `acknowledge()` immediately.
- **Status:** known / previously deferred

### [High] JWT sessions are not invalidated by a password change or reset
- **File:** `src/auth.ts:97` (`session: { strategy: "jwt" }`), `src/actions/profile.ts` (`changePassword`), `src/app/api/auth/password/reset/route.ts`
- **Issue:** Under the JWT strategy the session cookie is self-contained and is never re-checked against the database on subsequent requests. Neither `changePassword` nor the password-reset endpoint rotates any session-invalidating claim (there is no token-version field, and no `Session` rows exist to revoke since JWT sessions don't use the `Session` table).
- **Exploit:** An attacker who has obtained a victim's session cookie (stolen device, XSS elsewhere, a leaked cookie) keeps full access to the account for the cookie's remaining lifetime even after the victim notices the compromise and changes or resets their password — the one action a victim takes to lock the attacker out doesn't do so.
- **Fix:** Add a `tokenVersion` (or `passwordChangedAt`) claim to the JWT, bump it on password change/reset, and reject in the `jwt`/`session` callback when the claim is stale — or move to database sessions so a reset can `deleteMany` the user's `Session` rows.
- **Status:** known / previously deferred

### [High] Unlimited current-password guesses in profile `changePassword`
- **File:** `src/actions/profile.ts:66-75`
- **Issue:** `changePassword` compares the submitted `currentPassword` against the stored hash with `bcrypt.compare` (line 66) and returns a field-scoped error on mismatch, with no attempt counter, delay, or lockout.
- **Exploit:** Anyone holding a live session for an account (a stolen cookie, a shared/unattended browser, a CSRF-adjacent flow) can submit unlimited current-password guesses through this authenticated action to brute-force the account's actual password and then set a new one, fully taking over the account — the "current password" re-auth gate provides no real protection against exactly the attacker it exists to stop.
- **Fix:** Add a per-account attempt counter/backoff on this check (shared with the general rate-limiting work above), and consider re-requiring a fresh sign-in for a sensitive action like this rather than relying solely on an unthrottled compare.
- **Status:** known / previously deferred

### [Medium] No maximum length on password fields — bcryptjs truncation collision
- **File:** `src/lib/validation/auth.ts:12-14` (shared `password` schema, used by `registerSchema`, `resetPasswordSchema` and `changePasswordSchema`'s *new* password). Note `signInSchema.password` and `changePasswordSchema.currentPassword` are **not** the shared schema — they are their own `z.string().min(1)` with no upper bound at all, and they are the two fields that reach `bcrypt.compare`.
- **Issue:** The shared `password` field is `z.string().min(8, ...)` with no `.max()`. `bcryptjs` (`package.json`: `bcryptjs@^3.0.3`) silently truncates any input to 72 bytes before hashing — this is a documented, well-known class of bug (see the 2025 Strapi advisory for the identical pattern, GHSA-2cjv-6wg9-f4f3 / CVE-2025-25298). There is also no request body size limit configured anywhere (`next.config.ts` sets no such option), so the public `/api/auth/register` and `/api/auth/password/reset` route handlers, and the credentials `authorize()` compare, will all happily process an arbitrarily large `password` value.
- **Exploit:** Register `alice@example.com` with a password whose first 72 bytes are `P` followed by any suffix; bcryptjs hashes only the first 72 bytes, so signing in with a *different* password sharing the same 72-byte prefix (but a different suffix) succeeds — two distinct password strings unlock the same account. Separately, an unauthenticated caller can submit a multi-megabyte `password` value to `/api/auth/register` on every request, at zero cost to itself and unnecessary CPU/memory cost to the server, since nothing caps the field or the request body.
- **Fix:** Cap the shared `password` schema at bcrypt's 72-byte limit — but `.max(72)` alone is insufficient, since Zod counts UTF-16 code units, not bytes (30 emoji is length 60 and 120 bytes, so it passes a character cap and is still truncated). Pair the length cap with a byte check, e.g. `.refine(v => new TextEncoder().encode(v).length <= 72)`. Separately, give `signInSchema.password` and `changePasswordSchema.currentPassword` a loose upper bound (~1KB) so an unbounded body cannot be fed to `bcrypt.compare`; do **not** cap those two at 72, or anyone whose password was set before the cap is locked out — bcrypt truncates their input to the same 72 bytes it hashed, so it still matches.
- **Status:** new

### [Low] GitHub-linked accounts never get `emailVerified` persisted
- **File:** `src/auth.config.ts:27-49` (`fetchVerifiedGitHubProfile`), `@auth/prisma-adapter`'s `createUser`
- **Issue:** The overridden `userinfo.request` proves the GitHub email is `primary && verified`, but nothing in the adapter or callbacks stamps `User.emailVerified` for a GitHub-first sign-up — the column stays `null` even though the address has, in effect, already been verified by GitHub.
- **Exploit:** Not independently exploitable today — the account-linking gate in `src/auth.ts` only reads `emailVerified` on the *existing password account* being linked to, and a bare GitHub row without a password never reaches the credentials `authorize()` gate — but it is a latent trap for any future feature (e.g. a "set a password on my OAuth account" flow) that assumes `emailVerified` reflects real-world verification state.
- **Fix:** Set `emailVerified: new Date()` from the `signIn` callback whenever `account.provider === "github"` and the profile carried a verified email, so the column is honest for every code path that reads it later.
- **Status:** known / previously deferred

### [Low] `Tag` is a single global namespace shared by all users
- **File:** `prisma/schema.prisma:165-169`
- **Issue:** `Tag.name` is `@unique` with no `userId` column, so every user's items share one flat tag namespace instead of a per-user one.
- **Exploit:** Not an account-takeover or data-leak vector today (tags carry no content of their own and are only reachable through an `Item` the requester already owns), but it is a multi-tenancy gap: one user's choice of tag name silently constrains or is constrained by every other user's, and a departing user's orphaned `Tag` rows are left behind for another user to reuse.
- **Fix:** Add `userId` to `Tag` with a `@@unique([userId, name])` compound key before Item CRUD ships, per the standing note in `context/current-feature.md`.
- **Status:** known / previously deferred

## Passed Checks

- **Single shared password hasher.** `hashPassword()` in `src/lib/auth/password.ts` (bcrypt, `BCRYPT_ROUNDS = 12`) is the only place a password is ever hashed — used by `POST /api/auth/register`, `POST /api/auth/password/reset`, and `changePassword` in `src/actions/profile.ts` (`prisma/seed.ts` also imports it), so no write path can drift onto a different cost factor.
- **CSPRNG tokens, hash-only storage.** Both `createVerificationToken` (`src/lib/auth/verification-token.ts:19`) and `createPasswordResetToken` (`src/lib/auth/reset-token.ts:41`) mint 32 bytes from `crypto.randomBytes`; only `hashToken()`'s SHA-256 digest (`src/lib/auth/token-hash.ts:14`) is ever written to `VerificationToken.token`, and every lookup (`verification-token.ts:57`, `reset-token.ts:78`) is an indexed equality match on that hash — the raw token exists only in the function that mints it and the URL it's mailed in.
- **Expiry enforced at lookup, not just recorded.** `lookupVerificationToken` (`verification-token.ts:62`) and `lookupPasswordResetToken` (`reset-token.ts:89`) both compare `record.expires > new Date()` before treating a token as usable, rather than trusting the column was set correctly at issue time.
- **Reset TTL shorter than verification TTL.** 1 hour (`reset-token.ts:10`) versus 24 hours (`verification-token.ts:6`), since the reset token actually sets a credential.
- **Reset tokens are genuinely single-use.** `consumePasswordResetToken` (`reset-token.ts:101`) is called only *after* `prisma.user.update` succeeds (`src/app/api/auth/password/reset/route.ts:51-65`), so a failed write leaves the link usable for a retry instead of burning it on failure.
- **Verification and reset tokens are provably disjoint.** Reset tokens live under an `identifier` of `"password-reset:" + email` (`reset-token.ts:22-31`); `z.email()` rejects any address containing a colon, so no real email can ever collide with the namespaced form, and each flow's `deleteMany` only ever targets its own identifier — confirmed live per the Forgot Password feature history (a reset token and a verification token coexisting for one address, consuming one without touching the other).
- **The reset endpoint re-validates server-side.** `POST /api/auth/password/reset` calls `lookupPasswordResetToken` itself (`src/app/api/auth/password/reset/route.ts:42`) rather than trusting that `/reset-password`'s render-time check already passed.
- **User enumeration closed at the byte and timing level (mostly).** `register`, `password/forgot`, and `verify/resend` all return identical response bodies for known/unknown addresses; `password/forgot` additionally defers the real DB lookup and email send into Next's `after()` (`src/app/api/auth/password/forgot/route.ts:56-100`) specifically because the inline version measured a 10x timing delta — the fixed version was re-measured at ~4ms for both branches.
- **Authorization re-derives the session server-side.** `changePassword` and `deleteAccount` both call `requireUserId()` (`src/actions/profile.ts:50`, `:98`) rather than accepting a client-supplied id; `deleteAccount` re-checks the typed confirmation email against the session's own record server-side (`:110`) rather than trusting the dialog's disabled button.
- **Redirect targets are allow-listed.** `safeRedirectPath()` (`src/lib/auth-redirect.ts:6-15`) rejects anything that isn't a same-origin path, closing off both `//evil.com` and absolute-URL redirects; used consistently by the proxy, both sign-in server actions, and the sign-in page's post-auth redirect.
- **Zod on every request body.** `src/lib/validation/auth.ts` covers sign-in, register, forgot, resend, reset, change-password, and delete-confirmation, with email normalised (`trim().toLowerCase()`) *before* the format check (`z.email()`), so `"  A@B.com  "` is cleaned up rather than rejected.
- **Email templates escape user-controlled input.** `escapeHtml()` (`src/lib/email/templates.ts:10-16`) is applied to the user's `name` before interpolation into both the verification and password-reset HTML emails, preventing HTML injection via a crafted display name.
- **GitHub email trust hardened.** `fetchVerifiedGitHubProfile` (`src/auth.config.ts:27-49`) requires `primary && verified` with no fallback to an unverified or arbitrary address, closing the hole in the stock provider's `emails.find(e => e.primary) ?? emails[0]` logic.
- **Account-linking gate fails closed.** The `signIn` callback (`src/auth.ts:68-90`) only allows a GitHub sign-in to merge into an existing password account when `emailVerified` is set; Auth.js wraps any thrown error from this callback as `AccessDenied`, so a DB error denies rather than silently allows the link.
- **Profile page checks the session at every layer, not just the layout.** `AppShell` (`src/components/dashboard/AppShell.tsx:25`) resolves the session and redirects on a stale JWT (`:36`); `ProfilePage` independently calls `requireUserId()` again (`src/app/profile/page.tsx:30`) and redirects again on a null user (`:39`); `changePassword` and `deleteAccount` each call `requireUserId()` a third time inside the action itself.
- **`/profile` is covered by the proxy matcher.** `src/proxy.ts:25` lists `"/profile/:path*"` alongside `"/dashboard/:path*"`, and `:path*` matches zero segments too, so the bare route is covered.
- **Change-password refuses cleanly on a null hash.** `src/actions/profile.ts:59-64` returns a clear error rather than attempting `bcrypt.compare(_, null)` for an OAuth-only account.
- **Delete-account respects the FK constraint and clears the session.** The transaction in `src/actions/profile.ts:123-141` deletes items → collections → custom item types → accounts → sessions → verification tokens (both the bare and namespaced identifier) → the user row, honoring `Item.itemTypeId`'s `ON DELETE RESTRICT`, then calls `signOut({ redirectTo: "/sign-in?deleted=1" })` outside the try/catch so the cookie is always cleared on success.
- **No password hash ever reaches the client.** `getProfileUser` (`src/lib/db/users.ts:18-41`) selects `password` from the database but returns only the derived boolean `hasPassword`; the hash itself never leaves the function.

## Not Audited

- **The live GitHub OAuth browser round trip, toast rendering, and email client rendering** — this environment has no headless browser (project convention: verify with lint/build, hand off browser checks to Björn in Windows Chrome). Reasoned about from code; several of these paths were already confirmed working end-to-end by Björn per `context/current-feature.md`'s history, and that history was taken as given rather than re-verified.
- **Runtime concurrency behavior of `after()`** under real traffic beyond what the Forgot Password feature's own testing already established (the accepted, previously-documented widening of the resend race from "concurrent" to "rapid-repeat").
- **Item/Collection/Tag CRUD authorization** — out of scope for this auth-focused pass except where it intersects account deletion (verified) and the `Tag` scoping note above.
- **Any platform/edge-level protection** (e.g. a WAF or provider-level rate limiter in front of the deployed app) — only application code was reviewed, so if such a control exists in front of production it isn't reflected in the findings above.
