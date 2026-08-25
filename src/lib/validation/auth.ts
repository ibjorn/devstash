import { z } from "zod";

// Normalise before validating — a pasted email with stray whitespace should be
// cleaned up, not rejected. Lowercasing keeps sign-in and registration agreeing
// on the same key.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

// bcrypt reads only the first 72 bytes of its input and silently drops the
// rest, so two passwords sharing a 72-byte prefix hash to the same value and
// unlock the same account. Cap new passwords at the algorithm's own limit so
// that truncation can never happen in the first place.
const BCRYPT_MAX_BYTES = 72;

// .max() counts UTF-16 code units, not bytes — 72 accented or emoji characters
// still overflow bcrypt — so the byte check is the guard that actually holds.
// The length cap stays for the friendlier message in the common ASCII case.
const withinBcryptLimit = (value: string) =>
  new TextEncoder().encode(value).length <= BCRYPT_MAX_BYTES;

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(BCRYPT_MAX_BYTES, `Password must be at most ${BCRYPT_MAX_BYTES} characters`)
  .refine(
    withinBcryptLimit,
    "Password is too long — accented and emoji characters each count as several",
  );

// Passwords being *compared* rather than created are capped far more loosely:
// a bound keeps an unbounded body out of bcrypt, but rejecting at 72 would lock
// out anyone whose existing password was set before that cap — bcrypt truncates
// their input to the same 72 bytes it hashed, so it still matches.
const SUBMITTED_PASSWORD_MAX = 1024;

export const signInSchema = z.object({
  email,
  password: z
    .string()
    .min(1, "Password is required")
    .max(SUBMITTED_PASSWORD_MAX, "Password is too long"),
});

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resendVerificationSchema = z.object({ email });

export const forgotPasswordSchema = z.object({ email });

// The token rides in the same payload so one schema covers both the client
// form and the endpoint. Its path never collides with a rendered field, so the
// form's per-field error mapping simply ignores it.
export const resetPasswordSchema = z
  .object({
    // The message is set on the type check too, not just min(1) — a missing
    // field fails the type first, and Zod's raw "expected string, received
    // undefined" is not something to show a user.
    token: z
      .string("Reset link is missing its token")
      .min(1, "Reset link is missing its token"),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// Signed-in password change. The current password is checked against the hash
// rather than the session alone, so a walked-up-to browser can't silently
// change the credential.
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, "Enter your current password")
      .max(SUBMITTED_PASSWORD_MAX, "Password is too long"),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.password !== data.currentPassword, {
    message: "New password must be different from your current one",
    path: ["password"],
  });

// Typed confirmation before account deletion. Normalised but deliberately not
// validated as an email — the value's only job is to equal the account's own
// address, and a single "that doesn't match" message reads better than Zod
// second-guessing the shape of what was typed.
export const deleteAccountSchema = z.object({
  confirmEmail: z
    .string("Type your email address to confirm")
    .trim()
    .toLowerCase()
    .pipe(z.string().min(1, "Type your email address to confirm")),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
