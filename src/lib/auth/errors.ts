import { CredentialsSignin } from "next-auth";

/**
 * Thrown by the credentials provider when the password is correct but the
 * address was never confirmed.
 *
 * Auth.js rethrows AuthError subclasses untouched out of the callback route
 * (@auth/core/lib/actions/callback/index.js), and next-auth's signIn() runs
 * Auth in raw mode, so this instance lands in the catch of the server action
 * that called signIn — `code` can be read off it directly, no query string
 * round trip.
 */
export class EmailNotVerifiedError extends CredentialsSignin {
  code = "EmailNotVerified";
}

/**
 * Thrown by the credentials provider when the caller has spent their sign-in
 * attempts. Reaches the server action the same way EmailNotVerifiedError does —
 * as the thrown instance, not a serialised copy — so `retryAfterSeconds`
 * survives alongside `code` and the form can say how long the wait is.
 */
export class RateLimitedError extends CredentialsSignin {
  code = "RateLimited";
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super();
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
