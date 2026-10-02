import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignInForm } from "@/components/auth/SignInForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { safeRedirectPath } from "@/lib/auth-redirect";

export const metadata: Metadata = {
  title: "Sign in · DevStash",
};

// NextAuth funnels auth failures back here as ?error=<code>
const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: "Invalid email or password",
  OAuthAccountNotLinked:
    "That email is already registered with a different sign-in method",
  // Our own code, returned by the signIn callback in src/auth.ts
  AccountLinkBlocked:
    "That email already has a password account. Sign in with your password instead.",
  // Returned by the verification route in src/app/api/auth/verify
  VerificationInvalid:
    "That verification link isn't valid. Request a new one below.",
  VerificationExpired:
    "That verification link has expired. Request a new one below.",
  VerificationFailed:
    "Something went wrong verifying your email. Please try again.",
  // The signIn gate in src/auth.ts refused — most often because GitHub has no
  // primary, verified email for the account
  AccessDenied:
    "GitHub didn't give us a verified email address for your account. Verify your primary email on GitHub, then try again.",
  OAuthSignin: "Could not start the GitHub sign-in. Please try again.",
  OAuthCallback: "GitHub sign-in did not complete. Please try again.",
  SessionExpired:
    "Your session is no longer valid. Please sign in again.",
  Configuration: "Sign-in is misconfigured — check the server logs.",
};

// Success counterpart to ERROR_MESSAGES, set by the verification route
const VERIFIED_MESSAGES: Record<string, string> = {
  "1": "Email verified — you can sign in now.",
  already: "That email is already verified. Go ahead and sign in.",
};

// Set by the reset form once the password endpoint has accepted the change
const RESET_MESSAGES: Record<string, string> = {
  "1": "Password updated — sign in with your new password.",
};

// Set by the deleteAccount action in src/actions/profile.ts on its way out
const DELETED_MESSAGES: Record<string, string> = {
  "1": "Your account has been deleted.",
};

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
    verified?: string;
    reset?: string;
    deleted?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl, error, verified, reset, deleted } = await searchParams;
  const target = safeRedirectPath(callbackUrl);

  // Only one success hand-off can be in flight, so the first match wins
  const success = verified
    ? { message: VERIFIED_MESSAGES[verified], param: "verified" }
    : reset
      ? { message: RESET_MESSAGES[reset], param: "reset" }
      : deleted
        ? { message: DELETED_MESSAGES[deleted], param: "deleted" }
        : undefined;

  const session = await auth();
  if (session?.user) {
    redirect(target);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to your DevStash account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SignInForm
          callbackUrl={target}
          initialError={
            error
              ? (ERROR_MESSAGES[error] ??
                "Something went wrong signing you in. Please try again.")
              : undefined
          }
          initialSuccess={success?.message}
          successParam={success?.param}
          // A bad or stale link is the one case where the resend control has to
          // be reachable without a sign-in attempt first
          showResendVerification={
            error === "VerificationInvalid" || error === "VerificationExpired"
          }
        />
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="-my-1.5 inline-block py-1.5 text-foreground underline"
          >
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
