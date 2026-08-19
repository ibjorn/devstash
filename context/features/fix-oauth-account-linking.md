# Fix — OAuth Account Linking (GitHub ↔ Credentials)

## Problem

Registering with email/password, then signing in with GitHub using the **same
email address**, fails with:

> That email is already registered with a different sign-in method

That message is our copy for NextAuth's `OAuthAccountNotLinked` error. It is the
Auth.js default and it is deliberate: `handleLoginOrRegister` finds a `User` row
with a matching email but no `Account` row for `provider: "github"`, refuses to
link them, and throws.

The default exists to block a **pre-registration takeover**: an attacker
registers a password account using a victim's email address *before* the victim
ever signs in with GitHub. If linking were automatic, the victim's OAuth sign-in
would silently join the attacker's account, handing the attacker password access
to the victim's data.

Our registration endpoint does not verify email addresses, so simply flipping
`allowDangerousEmailAccountLinking: true` would leave that hole wide open.

## Goals

- Sign in with GitHub links to an existing password account **only when that
  account's `emailVerified` is set**.
- An unverified password account still refuses to link, but says something
  actionable ("sign in with your password") instead of the current dead end.
- Credentials sign-in is untouched.
- A brand-new GitHub user (no matching email) still gets a fresh account.
- An already-linked GitHub user still signs in normally.
- No schema change, no new dependency.

## Approach

1. `src/auth.config.ts` — `GitHub({ allowDangerousEmailAccountLinking: true })`.
   The flag alone is all-or-nothing; it only *permits* linking.
2. `src/auth.ts` — add a `signIn` callback that decides per-user whether the
   link is allowed. Verified against the Auth.js source: `handleAuthorized`
   (which invokes the `signIn` callback) runs **before** `handleLoginOrRegister`
   (which links or throws), and returning a string from `signIn` redirects.
   The callback needs Prisma, so it lives in `auth.ts`, not the edge config —
   and it must merge `...authConfig.callbacks` so the existing `session`
   callback survives.

Decision table for a GitHub sign-in:

| Existing user for that email | Has a `github` Account row | Outcome |
|---|---|---|
| none | — | `true` — adapter creates a new user |
| yes | yes | `true` — ordinary sign-in |
| yes, `emailVerified` set | no | `true` — adapter links the account |
| yes, `emailVerified` null | no | redirect to `/sign-in?error=AccountLinkBlocked` |

3. `src/app/(auth)/sign-in/page.tsx` — map the new `AccountLinkBlocked` code to
   a message telling the user to sign in with their password.

## Notes

- **Stopgap, not the end state.** Until email verification exists, `emailVerified`
  is only ever set by hand, so every *other* new credentials user still hits the
  wall — just with better copy. The real fix is verification-on-register, after
  which the gate starts passing on its own.
- The mirror case is still open: a GitHub-first user cannot add a password
  (`POST /api/auth/register` 409s). Out of scope here; needs a "set a password"
  flow on a signed-in session.
- Email matching is case-sensitive on both sides (our lookup and the adapter's
  `getUserByEmail`). If a provider ever returned mixed case for an address we
  stored lowercased, both would miss and a separate account would be created —
  consistent, but worth knowing.
- Fail closed: an error thrown inside the `signIn` callback is wrapped as
  `AccessDenied` by Auth.js, so a DB blip denies the sign-in rather than
  allowing it.

## Testing

- `npm run lint` + `npm run build`.
- curl: signed-out `/dashboard` still redirects; credentials sign-in still works;
  `/api/auth/providers` still lists both.
- Björn in Windows Chrome: the GitHub round-trip both before and after setting
  `emailVerified` on his own row.
