import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth/token-hash";

/**
 * How long a reset link stays usable. Deliberately far shorter than the 24h
 * verification TTL — this token sets a credential, so its window to be
 * intercepted out of a mailbox should be small.
 */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/**
 * VerificationToken has no column saying what a token is *for*, and it already
 * holds email-verification tokens. Left undivided, a 24h "confirm your address"
 * link would also work as "set a new password on this account" — so reset
 * tokens are namespaced and every lookup here demands the prefix.
 *
 * A bare email can never be mistaken for a namespaced identifier: the email
 * rules in src/lib/validation/auth.ts run through Zod's `z.email()`, which
 * rejects a colon anywhere in the address, so the two sets are disjoint.
 */
const RESET_PREFIX = "password-reset:";

function resetIdentifier(email: string): string {
  return `${RESET_PREFIX}${email}`;
}

/**
 * Issues a fresh password-reset token, replacing any outstanding one so a user
 * only ever holds a single live link. Requesting a second reset invalidates the
 * first, which is what you want if the first email went somewhere it shouldn't.
 *
 * @returns the raw token — this is the only time it exists in plaintext
 */
export async function createPasswordResetToken(email: string): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");

  // Clear this identifier's previous token, and opportunistically sweep any
  // expired rows (of either kind) left behind by links that were never followed
  await prisma.verificationToken.deleteMany({
    where: {
      OR: [{ identifier: resetIdentifier(email) }, { expires: { lt: new Date() } }],
    },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: resetIdentifier(email),
      token: hashToken(rawToken),
      expires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
    },
  });

  return rawToken;
}

export type ResetTokenLookup =
  | { status: "valid"; email: string }
  | { status: "expired"; email: string }
  | { status: "unknown" };

/**
 * Resolves a raw reset token to the email it was issued for.
 *
 * Read-only on purpose: the emailed link is a GET that only renders the form,
 * and the mutation is a separate POST. That split is what lets this flow do
 * what email verification can't — corporate link scanners (Outlook Safe Links
 * and friends) follow the GET, but they don't POST, so the token survives the
 * scanner and is spent only by the real submit.
 */
export async function lookupPasswordResetToken(
  rawToken: string,
): Promise<ResetTokenLookup> {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(rawToken) },
  });

  // A verification token must never resolve here, so anything without the
  // prefix is treated as if it didn't exist at all
  if (!record || !record.identifier.startsWith(RESET_PREFIX)) {
    return { status: "unknown" };
  }

  const email = record.identifier.slice(RESET_PREFIX.length);
  return record.expires > new Date()
    ? { status: "valid", email }
    : { status: "expired", email };
}

/**
 * Spends the token. Called only after the password is actually written, so a
 * failed update leaves the link usable for a retry.
 *
 * deleteMany rather than delete: a double submit would otherwise throw on the
 * second pass for a row that's already gone.
 */
export async function consumePasswordResetToken(rawToken: string): Promise<void> {
  await prisma.verificationToken.deleteMany({
    where: { token: hashToken(rawToken) },
  });
}

/**
 * Recovers when a reset token was issued. VerificationToken has no createdAt
 * (it's NextAuth's own model), but expires is always issuedAt + TTL, so the
 * request cooldown can work it back out without a schema change.
 */
export function resetTokenIssuedAt(expires: Date): Date {
  return new Date(expires.getTime() - RESET_TOKEN_TTL_MS);
}

/** The outstanding reset token for an email, if any — used by the cooldown. */
export async function findOutstandingResetToken(email: string) {
  return prisma.verificationToken.findFirst({
    where: { identifier: resetIdentifier(email), expires: { gt: new Date() } },
    orderBy: { expires: "desc" },
  });
}
