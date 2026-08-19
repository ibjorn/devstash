import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

/** How long a verification link stays usable. */
export const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Only the hash is stored, so a read of the VerificationToken table doesn't let
 * anyone verify an address they don't own. SHA-256 is right here where bcrypt
 * isn't: the input is 32 bytes of CSPRNG output, so there's nothing to brute
 * force, and the lookup has to be a plain indexed equality match.
 */
function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Issues a fresh verification token for an email, replacing any outstanding
 * one so a user can only ever hold a single live link.
 *
 * @returns the raw token — this is the only time it exists in plaintext
 */
export async function createVerificationToken(email: string): Promise<string> {
  const rawToken = randomBytes(32).toString("base64url");

  // Clear this identifier's previous token, and opportunistically sweep any
  // expired rows left behind by tokens that were never followed
  await prisma.verificationToken.deleteMany({
    where: {
      OR: [{ identifier: email }, { expires: { lt: new Date() } }],
    },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(rawToken),
      expires: new Date(Date.now() + TOKEN_TTL_MS),
    },
  });

  return rawToken;
}

export type TokenLookup =
  | { status: "valid"; email: string }
  | { status: "expired"; email: string }
  | { status: "unknown" };

/**
 * Resolves a raw token to the email it was issued for.
 *
 * The token is deliberately *not* deleted on use, so it keeps working until it
 * expires. Corporate link scanners (Outlook Safe Links and friends) fetch the
 * URL before the human clicks it, and a delete-on-use token would already be
 * spent by the time the real user follows their own link. Replaying costs
 * nothing: the token only ever marks this one address verified, which is
 * idempotent. Rows are cleared when a new token is issued, or on expiry.
 */
export async function lookupVerificationToken(
  rawToken: string,
): Promise<TokenLookup> {
  const record = await prisma.verificationToken.findUnique({
    where: { token: hashToken(rawToken) },
  });
  if (!record) return { status: "unknown" };

  return record.expires > new Date()
    ? { status: "valid", email: record.identifier }
    : { status: "expired", email: record.identifier };
}

/**
 * Recovers when a token was issued. VerificationToken has no createdAt (it's
 * NextAuth's own model), but expires is always issuedAt + TOKEN_TTL_MS, so the
 * resend cooldown can work it back out without a schema change.
 */
export function tokenIssuedAt(expires: Date): Date {
  return new Date(expires.getTime() - TOKEN_TTL_MS);
}

/** The outstanding token for an email, if any — used by the resend cooldown. */
export async function findOutstandingToken(email: string) {
  return prisma.verificationToken.findFirst({
    where: { identifier: email, expires: { gt: new Date() } },
    orderBy: { expires: "desc" },
  });
}
