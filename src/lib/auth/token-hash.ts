import { createHash } from "crypto";

/**
 * Hashes a single-use token for storage.
 *
 * Only the hash is ever written, so a read of the VerificationToken table
 * doesn't hand anyone a working link. SHA-256 is right here where bcrypt isn't:
 * the input is 32 bytes of CSPRNG output, so there's nothing to brute force,
 * and the lookup has to be a plain indexed equality match.
 *
 * Shared by the email-verification and password-reset tokens so the two can't
 * drift onto different algorithms.
 */
export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}
