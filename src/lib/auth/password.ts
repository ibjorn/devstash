import bcrypt from "bcryptjs";

/**
 * bcrypt cost factor for every password hash in the app.
 *
 * Shared rather than redeclared per call site: registration, password reset,
 * the profile's change-password action and the seed script all have to agree,
 * and a hash written at a different cost still verifies, so drift here would
 * go unnoticed until someone audited the stored hashes.
 */
export const BCRYPT_ROUNDS = 12;

export function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_ROUNDS);
}
