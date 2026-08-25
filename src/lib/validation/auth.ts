import { z } from "zod";

// Normalise before validating — a pasted email with stray whitespace should be
// cleaned up, not rejected. Lowercasing keeps sign-in and registration agreeing
// on the same key.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address"));

const password = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
