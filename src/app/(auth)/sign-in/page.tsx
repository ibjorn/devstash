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
  OAuthSignin: "Could not start the GitHub sign-in. Please try again.",
  OAuthCallback: "GitHub sign-in did not complete. Please try again.",
  Configuration: "Sign-in is misconfigured — check the server logs.",
};

interface SignInPageProps {
  searchParams: Promise<{
    callbackUrl?: string;
    error?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const { callbackUrl, error } = await searchParams;
  const target = safeRedirectPath(callbackUrl);

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
        />
        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-foreground underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
