# Fix — GitHub Sign-In Loading State

## Problem

The "Sign in with GitHub" button on `/sign-in` gives no feedback when clicked.
The user clicks, nothing visibly changes, and the browser sits there until
github.com responds — which can take a noticeable moment. With no spinner and
no disabled state, the natural reaction is to click again.

This is the **only** submit button in the app without a pending state. Every
other one already follows the same pattern:

| File | Line |
|---|---|
| `src/components/auth/SignInForm.tsx` (credentials button) | 101 |
| `src/components/auth/RegisterForm.tsx` | 134 |
| `src/components/auth/ResetPasswordForm.tsx` | 112 |
| `src/components/auth/ForgotPasswordForm.tsx` | 109 |
| `src/components/auth/ResendVerification.tsx` | 78 |
| `src/components/profile/ChangePasswordDialog.tsx` | 130 |
| `src/components/profile/DeleteAccountDialog.tsx` | 125 |
| `src/components/profile/SetPasswordButton.tsx` | 68 |

So this is not a new pattern to introduce — it is the one place the existing
pattern was missed.

## Root Cause

The credentials form gets `pending` for free from `useActionState`
(`SignInForm.tsx:41`). The GitHub form passes the server action straight to
`<form action={signInWithGitHub}>` (`SignInForm.tsx:120`), so there is no
`pending` value in scope for its button.

This is **not** a bug in the sign-in flow itself. The server-action handoff is
correct and deliberate (Auth Phase 3) — see the separate
`context/fixes/github-oauth-redirect-fix.md`, which describes a client-side
`signIn` problem this codebase does not have. Purely a missing UI affordance.

## Goals

- Clicking "Sign in with GitHub" immediately shows a spinner and disables the
  button, so a slow GitHub response looks like progress rather than a dead
  click.
- Matches the existing `Loader2 … animate-spin` treatment used by every other
  button, so it reads as one system.
- No change to the sign-in flow, the server action, or `safeRedirectPath`.
- No new dependency, no schema change.

## Approach

### 1. New `src/components/auth/GitHubSignInButton.tsx`

`useFormStatus()` (from `react-dom`) only reports the status of the form
belonging to its component's **parent**, so the button cannot read it from
inside `SignInForm` — it has to be extracted into its own client component
rendered inside the `<form>`. That extraction is the whole reason for the new
file; it is not gratuitous decomposition.

```tsx
"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

import { GitHubIcon } from "@/components/auth/GitHubIcon";
import { Button } from "@/components/ui/button";

export function GitHubSignInButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" className="w-full" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <GitHubIcon className="size-4" />
      )}
      {pending ? "Redirecting to GitHub…" : "Sign in with GitHub"}
    </Button>
  );
}
```

Note this **swaps** the icon rather than adding a spinner next to it. The other
buttons in the table above have an empty icon slot for the spinner to fill;
this one already has the GitHub mark, and showing both would be cluttered.

### 2. Update `src/components/auth/SignInForm.tsx`

Replace the inline `<Button>` inside the GitHub `<form>` (lines 122-125) with
`<GitHubSignInButton />`. The hidden `callbackUrl` input stays exactly as it is.
Drop the now-unused `GitHubIcon` import if nothing else in the file uses it.

### 3. bfcache guard — verify before deciding

The spinner covers the right window: `signIn("github")` is fast (it only builds
the authorization URL locally), so the actual wait is the browser navigating to
github.com and GitHub responding. The page stays mounted throughout, so
`pending` stays true until the new document paints.

The open question is the way **back**. If the user clicks GitHub, changes their
mind on the consent screen and presses Back, the page may be restored from the
browser's bfcache with the JS heap intact — which would restore a stuck spinner
on a permanently disabled button, recoverable only by refreshing. Trading a
dead click for a dead button would be a net loss.

**This is unverified.** It is not certain Chrome keeps the page eligible for
bfcache after a server-action redirect to an external origin. Check it in
Windows Chrome first — WSL has no headless browser, and this specific behaviour
cannot be reproduced by curl.

If it does reproduce, the cheap fix is a `pageshow` listener in the button
component:

```tsx
useEffect(() => {
  const onShow = (e: PageTransitionEvent) => {
    if (e.persisted) window.location.reload();
  };
  window.addEventListener("pageshow", onShow);
  return () => window.removeEventListener("pageshow", onShow);
}, []);
```

A reload is used rather than resetting state because `useFormStatus` is
read-only — there is nothing to reset from the consumer side.

## Notes

- Scope is `/sign-in` only. `/register` has no GitHub button today; if one is
  added later it should reuse `GitHubSignInButton`.
- `SidebarUserMenu`'s sign-out button is intentionally out of scope — sign-out
  is local and fast, with none of the third-party latency that motivates this.
- Consider whether "Redirecting to GitHub…" is the right copy versus keeping
  the label static and only swapping the icon. Changing label width mid-click
  is a small layout shift; the spinner alone may be enough.

## Verification

- `npm run lint` and `npm run build`.
- Browser pass in Windows Chrome (required — this change is *entirely* visual
  and cannot be verified from WSL):
  - Click "Sign in with GitHub": spinner appears immediately, button disables,
    GitHub loads.
  - Double-click it: only one navigation, no double submit.
  - Complete the OAuth round trip: still lands on `/dashboard` (or the
    `callbackUrl`) — confirms the hidden input and `safeRedirectPath` are
    untouched.
  - Press Back from GitHub's consent screen: button must be usable again. This
    is the bfcache case in step 3 above.
  - Credentials sign-in spinner still behaves as before (unchanged, but it is
    the sibling form in the same component).
