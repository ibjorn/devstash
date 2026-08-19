"use client";

import { useActionState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  signInWithCredentials,
  signInWithGitHub,
  type SignInState,
} from "@/actions/auth";
import { GitHubIcon } from "@/components/auth/GitHubIcon";
import { ResendVerification } from "@/components/auth/ResendVerification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const INITIAL_STATE: SignInState = { error: null };

// String, not a URL object — that's the form Next's patched replaceState
// documents for search-param updates that skip a refetch
function stripParam(name: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}

interface SignInFormProps {
  callbackUrl: string;
  /** Error handed over by NextAuth as ?error=..., e.g. a failed OAuth callback */
  initialError?: string;
  /** Success handed over by the verification route as ?verified=... */
  initialSuccess?: string;
  /** Offer the resend control straight away, without a sign-in attempt first */
  showResendVerification?: boolean;
}

export function SignInForm({
  callbackUrl,
  initialError,
  initialSuccess,
  showResendVerification = false,
}: SignInFormProps) {
  const [state, formAction, pending] = useActionState(
    signInWithCredentials,
    INITIAL_STATE,
  );

  // Surface whatever NextAuth put in the query string, then strip the param so
  // a refresh doesn't replay a stale failure. The id collapses the duplicate
  // toast that Strict Mode's double-mount would otherwise produce.
  useEffect(() => {
    if (!initialError) return;
    toast.error(initialError, { id: "sign-in-error" });
    stripParam("error");
  }, [initialError]);

  // Same treatment for the verification route's success hand-off
  useEffect(() => {
    if (!initialSuccess) return;
    toast.success(initialSuccess, { id: "sign-in-verified" });
    stripParam("verified");
  }, [initialSuccess]);

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
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </Button>
      </form>

      {/* Shown once we know an address is unverified, or when the user
          arrived from a link that was stale or malformed */}
      {(state.unverifiedEmail || showResendVerification) && (
        <ResendVerification defaultEmail={state.unverifiedEmail} />
      )}

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        OR
        <span className="h-px flex-1 bg-border" />
      </div>

      {/* Separate form — the OAuth handoff is its own server action */}
      <form action={signInWithGitHub}>
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Button type="submit" variant="outline" className="w-full">
          <GitHubIcon className="size-4" />
          Sign in with GitHub
        </Button>
      </form>
    </div>
  );
}
