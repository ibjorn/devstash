"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  EMAIL_COOLDOWN_SECONDS,
  formatCountdown,
} from "@/lib/auth/email-cooldown";

interface SetPasswordButtonProps {
  email: string;
}

/**
 * For GitHub-only accounts. Rather than setting a password straight from the
 * session, this asks the existing reset endpoint to email a link: that flow
 * already branches on `hasPassword` and words itself as "set a password", and
 * routing through the inbox keeps proof-of-address in the loop instead of
 * letting whoever holds the session mint a new way in.
 */
export function SetPasswordButton({ email }: SetPasswordButtonProps) {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [lockout, setLockout] = useState(0);

  useEffect(() => {
    if (lockout <= 0) return;
    const id = setTimeout(() => setLockout((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [lockout]);

  async function handleClick() {
    setPending(true);
    try {
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.error ?? "Could not send a set-up link");
        return;
      }

      setSent(true);
      // The server ignores a second request inside its cooldown, so re-enabling
      // the button sooner would only invite a click that does nothing
      setLockout(EMAIL_COOLDOWN_SECONDS);
      toast.success("Check your inbox", { description: result?.data?.message });
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        onClick={handleClick}
        disabled={pending || lockout > 0}
      >
        {pending && <Loader2 className="size-4 animate-spin" />}
        {lockout > 0
          ? `Email me a set-up link (${formatCountdown(lockout)})`
          : sent
            ? "Send another link"
            : "Email me a set-up link"}
      </Button>
      {sent && (
        <p className="text-sm text-muted-foreground">
          The link expires in an hour. If it doesn&apos;t arrive, check your
          spam folder before requesting another.
        </p>
      )}
    </div>
  );
}
