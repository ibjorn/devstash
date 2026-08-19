"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationSchema } from "@/lib/validation/auth";

interface ResendVerificationProps {
  /** Prefilled when a sign-in attempt already told us which address is stuck */
  defaultEmail?: string;
}

export function ResendVerification({ defaultEmail }: ResendVerificationProps) {
  // Only asks for the address when we don't already know it
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [pending, setPending] = useState(false);

  async function handleResend() {
    const parsed = resendVerificationSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ?? "Enter a valid email address",
      );
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/auth/verify/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.error ?? "Could not send a new link");
        return;
      }

      toast.success("Check your inbox", {
        description: result?.data?.message,
      });
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <p className="text-sm text-muted-foreground">
        Need a new verification link?
      </p>
      {!defaultEmail && (
        <div className="space-y-2">
          <Label htmlFor="resend-email">Email</Label>
          <Input
            id="resend-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleResend}
        disabled={pending}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        Resend verification email
      </Button>
    </div>
  );
}
