/**
 * Whether to skip the email-verification requirement for new accounts.
 *
 * Switched on while Resend has no verified domain: `onboarding@resend.dev` only
 * delivers to the Resend account owner, so every other address would register
 * fine and then be permanently unable to receive its link.
 *
 * **Only a literal `true` skips verification.** Unset, `false`, empty or
 * garbage all leave it required, so a typo in a deployment's environment can
 * never silently switch verification off in production.
 *
 * Server-only. Deliberately never `NEXT_PUBLIC_`: the browser has no business
 * deciding this, and anything the client needs to know is handed to it by the
 * register endpoint's response.
 */
export function skipEmailVerification(): boolean {
  return process.env.SKIP_EMAIL_VERIFICATION?.trim().toLowerCase() === "true";
}
