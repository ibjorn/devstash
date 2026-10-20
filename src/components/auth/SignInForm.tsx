"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { signInWithCredentials, type SignInState } from "@/actions/auth";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { GitHubButton } from "@/components/auth/GitHubButton";
import { ResendVerification } from "@/components/auth/ResendVerification";
import { PendingButton } from "@/components/forms/PendingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHandoffToast } from "@/hooks/use-handoff-toast";

const INITIAL_STATE: SignInState = { error: null };

interface SignInFormProps {
  callbackUrl: string;
  /** Error handed over by NextAuth as ?error=..., e.g. a failed OAuth callback */
  initialError?: string;
  /** Success handed over by another route, e.g. ?verified=1 or ?reset=1 */
  initialSuccess?: string;
  /** Which param carried initialSuccess, so it can be stripped after toasting */
  successParam?: string;
  /** Offer the resend control straight away, without a sign-in attempt first */
  showResendVerification?: boolean;
}

export function SignInForm({
  callbackUrl,
  initialError,
  initialSuccess,
  successParam,
  showResendVerification = false,
}: SignInFormProps) {
  const [state, formAction, pending] = useActionState(
    signInWithCredentials,
    INITIAL_STATE,
  );

  // Whatever NextAuth put in the query string — a failed OAuth callback
  useHandoffToast(initialError, "error", (error) =>
    toast.error(error, { id: "sign-in-error" }),
  );

  // Same treatment for a success hand-off — email verified, password reset
  useHandoffToast(initialSuccess, successParam, (success) =>
    toast.success(success, { id: "sign-in-success" }),
  );

  // Every failed submit returns a fresh state object, so repeat failures
  // re-fire rather than going silent
  useEffect(() => {
    if (state.error) toast.error(state.error);
  }, [state]);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="-my-1.5 py-1.5 text-sm text-muted-foreground underline hover:text-foreground"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <PendingButton pending={pending} type="submit" className="w-full">
          Sign in
        </PendingButton>
      </form>

      {/* Shown once we know an address is unverified, or when the user
          arrived from a link that was stale or malformed */}
      {(state.unverifiedEmail || showResendVerification) && (
        <ResendVerification defaultEmail={state.unverifiedEmail} />
      )}

      <AuthDivider />

      <GitHubButton callbackUrl={callbackUrl} label="Sign in with GitHub" />
    </div>
  );
}
