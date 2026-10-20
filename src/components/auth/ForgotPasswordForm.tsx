"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { ResetLinkSentNote } from "@/components/auth/ResetLinkSentNote";
import { fieldErrorProps, FormField } from "@/components/forms/FormField";
import { PendingButton } from "@/components/forms/PendingButton";
import { Input } from "@/components/ui/input";
import { useEmailCooldown } from "@/hooks/use-email-cooldown";
import { useHandoffToast } from "@/hooks/use-handoff-toast";
import { postJson } from "@/lib/post-json";
import { forgotPasswordSchema } from "@/lib/validation/auth";

interface ForgotPasswordFormProps {
  /** Handed over by /reset-password as ?error=... when a link was unusable */
  initialError?: string;
}

export function ForgotPasswordForm({ initialError }: ForgotPasswordFormProps) {
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const { sent, locked, countdown, markSent } = useEmailCooldown();

  useHandoffToast(initialError, "error", (error) =>
    toast.error(error, { id: "forgot-password-error" }),
  );

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
    const result = await postJson<{ message?: string }>(
      "/api/auth/password/forgot",
      parsed.data,
      "Could not send a reset link",
    );
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    // The endpoint answers identically for every address, so this says the
    // same thing whether or not an account exists
    markSent();
    toast.success("Check your inbox", { description: result.data?.message });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <FormField id="email" label="Email" error={fieldError}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...fieldErrorProps("email", fieldError)}
        />
      </FormField>

      <PendingButton
        pending={pending}
        type="submit"
        className="w-full"
        disabled={locked}
      >
        {locked
          ? `Send another link (${countdown})`
          : sent
            ? "Send another link"
            : "Send reset link"}
      </PendingButton>

      {sent && <ResetLinkSentNote />}
    </form>
  );
}
