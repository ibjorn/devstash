"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { safeRedirectPath } from "@/lib/auth-redirect";
import { signInSchema } from "@/lib/validation/auth";

export interface SignInState {
  error: string | null;
}

// One message for every failure mode — the form must not reveal whether an
// email exists, matching the authorize() behaviour in src/auth.ts
const INVALID_CREDENTIALS = "Invalid email or password";

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
    // A successful sign-in throws NEXT_REDIRECT, which has to bubble up
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
