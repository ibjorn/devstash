"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn, signOut } from "@/auth";
import { safeRedirectPath } from "@/lib/auth-redirect";
import { signInSchema } from "@/lib/validation/auth";

export interface SignInState {
  error: string | null;
  /** Set when the account exists but its email was never confirmed. */
  unverifiedEmail?: string;
}

// One message for every failure mode — the form must not reveal whether an
// email exists, matching the authorize() behaviour in src/auth.ts
const INVALID_CREDENTIALS = "Invalid email or password";

const EMAIL_NOT_VERIFIED =
  "Verify your email address before signing in — check your inbox for the link.";

export async function signInWithCredentials(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? INVALID_CREDENTIALS };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safeRedirectPath(formData.get("callbackUrl")),
    });
  } catch (error) {
    // A successful sign-in throws NEXT_REDIRECT, which has to bubble up.
    // Auth.js rethrows AuthError subclasses out of the callback route
    // untouched, so the instance authorize() threw arrives here with its code.
    if (
      error instanceof CredentialsSignin &&
      error.code === "EmailNotVerified"
    ) {
      return { error: EMAIL_NOT_VERIFIED, unverifiedEmail: parsed.data.email };
    }
    if (error instanceof AuthError) {
      return { error: INVALID_CREDENTIALS };
    }
    throw error;
  }

  // Unreachable: signIn either threw a redirect or an AuthError
  return { error: null };
}

export async function signInWithGitHub(formData: FormData) {
  await signIn("github", {
    redirectTo: safeRedirectPath(formData.get("callbackUrl")),
  });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" });
}
