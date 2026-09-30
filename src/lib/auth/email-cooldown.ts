/**
 * Minimum gap between two emails of the same kind to the same address, shared
 * by the password-reset and verification-resend endpoints so they behave
 * alike. The client lockouts on the buttons that call them read it too: a
 * second request inside the window is silently skipped by the server, so
 * re-enabling a button any sooner would toast "check your inbox" over an email
 * that was never sent.
 *
 * Kept free of imports so client components can use it without pulling server
 * code into the bundle.
 */
export const EMAIL_COOLDOWN_MS = 5 * 60 * 1000;

export const EMAIL_COOLDOWN_SECONDS = EMAIL_COOLDOWN_MS / 1000;

/** Renders a lockout countdown as "m:ss", e.g. 299 → "4:59". */
export function formatCountdown(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(whole / 60);
  return `${minutes}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * Whether an email issued at `issuedAt` is still inside the cooldown, so a
 * repeat request should be silently skipped rather than sending again.
 */
export function isWithinEmailCooldown(
  issuedAt: Date,
  now: number = Date.now(),
): boolean {
  return now - issuedAt.getTime() < EMAIL_COOLDOWN_MS;
}
