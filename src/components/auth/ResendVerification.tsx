"use client";

import { useState } from "react";
import { toast } from "sonner";

import { PendingButton } from "@/components/forms/PendingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postJson } from "@/lib/post-json";
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
    const result = await postJson<{ message?: string }>(
      "/api/auth/verify/resend",
      parsed.data,
      "Could not send a new link",
    );
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Check your inbox", { description: result.data?.message });
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
      <PendingButton
        pending={pending}
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleResend}
      >
        Resend verification email
      </PendingButton>
    </div>
  );
}
