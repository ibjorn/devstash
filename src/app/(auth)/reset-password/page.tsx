import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { lookupPasswordResetToken } from "@/lib/auth/reset-token";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Set a new password · DevStash",
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

/**
 * Validates the link before rendering the form, so a dead token is caught here
 * rather than after the user has typed a password twice. The check is
 * read-only — the token is spent by the POST, not by this render, which is
 * what keeps mailbox link scanners from burning it.
 *
 * Note there's no signed-in redirect: a reset link has to work regardless of
 * whose session the browser happens to be carrying.
 */
export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;
  if (!token) redirect("/forgot-password?error=ResetInvalid");

  const lookup = await lookupPasswordResetToken(token);
  if (lookup.status === "unknown") {
    redirect("/forgot-password?error=ResetInvalid");
  }
  if (lookup.status === "expired") {
    redirect("/forgot-password?error=ResetExpired");
  }

  const user = await prisma.user.findUnique({
    where: { email: lookup.email },
    select: { password: true },
  });
  if (!user) redirect("/forgot-password?error=ResetInvalid");

  // An OAuth-only account is setting a first password, not replacing one
  const hasPassword = Boolean(user.password);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {hasPassword ? "Set a new password" : "Set a password"}
        </CardTitle>
        <CardDescription>
          {hasPassword
            ? `Choose a new password for ${lookup.email}.`
            : `Choose a password for ${lookup.email}. You'll still be able to sign in with GitHub.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ResetPasswordForm token={token} hasPassword={hasPassword} />
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/sign-in" className="text-foreground underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
