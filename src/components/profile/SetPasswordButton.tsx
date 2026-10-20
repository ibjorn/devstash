"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ResetLinkSentNote } from "@/components/auth/ResetLinkSentNote";
import { PendingButton } from "@/components/forms/PendingButton";
import { useEmailCooldown } from "@/hooks/use-email-cooldown";
import { postJson } from "@/lib/post-json";

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
  const { sent, locked, countdown, markSent } = useEmailCooldown();

  async function handleClick() {
    setPending(true);
    const result = await postJson<{ message?: string }>(
      "/api/auth/password/forgot",
      { email },
      "Could not send a set-up link",
    );
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    markSent();
    toast.success("Check your inbox", { description: result.data?.message });
  }

  return (
    <div className="space-y-2">
      <PendingButton
        pending={pending}
        variant="outline"
        onClick={handleClick}
        disabled={locked}
      >
        {locked
          ? `Email me a set-up link (${countdown})`
          : sent
            ? "Send another link"
            : "Email me a set-up link"}
      </PendingButton>
      {sent && <ResetLinkSentNote />}
    </div>
  );
}
