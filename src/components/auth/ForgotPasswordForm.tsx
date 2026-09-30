"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EMAIL_COOLDOWN_SECONDS,
  formatCountdown,
} from "@/lib/auth/email-cooldown";
import { stripSearchParam } from "@/lib/url-params";
import { forgotPasswordSchema } from "@/lib/validation/auth";

interface ForgotPasswordFormProps {
  /** Handed over by /reset-password as ?error=... when a link was unusable */
  initialError?: string;
}

export function ForgotPasswordForm({ initialError }: ForgotPasswordFormProps) {
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [lockout, setLockout] = useState(0);

  // Re-armed each tick rather than run as one long interval — simpler to reason
  // about, and the timer is cleared on unmount either way
  useEffect(() => {
    if (lockout <= 0) return;
    const id = setTimeout(() => setLockout((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [lockout]);

  // Surface the hand-off, then strip the param so a refresh doesn't replay it.
  // The id collapses the duplicate Strict Mode's double-mount would produce.
  useEffect(() => {
    if (!initialError) return;
    toast.error(initialError, { id: "forgot-password-error" });
    stripSearchParam("error");
  }, [initialError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(undefined);

    const formData = new FormData(event.currentTarget);
    // Same schema the endpoint runs, so an obvious typo costs no round trip
    const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      setFieldError(
        parsed.error.issues[0]?.message ?? "Enter a valid email address",
      );
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.error ?? "Could not send a reset link");
        return;
      }

      // The endpoint answers identically for every address, so this says the
      // same thing whether or not an account exists
      setSent(true);
      // A second request inside the server's cooldown is silently ignored, so
      // offering the button back sooner would only invite a click that does
      // nothing — or, if it lands before the first request's deferred send
      // has finished, a duplicate email.
      setLockout(EMAIL_COOLDOWN_SECONDS);
      toast.success("Check your inbox", { description: result?.data?.message });
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(fieldError)}
          aria-describedby={fieldError ? "email-error" : undefined}
        />
        {fieldError && (
          <p id="email-error" className="text-sm text-destructive">
            {fieldError}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending || lockout > 0}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {lockout > 0
          ? `Send another link (${formatCountdown(lockout)})`
          : sent
            ? "Send another link"
            : "Send reset link"}
      </Button>

      {sent && (
        <p className="text-sm text-muted-foreground">
          The link expires in an hour. If it doesn&apos;t arrive, check your
          spam folder before requesting another.
        </p>
      )}
    </form>
  );
}
