"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AuthDivider } from "@/components/auth/AuthDivider";
import { GitHubButton } from "@/components/auth/GitHubButton";
import { fieldErrorProps, FormField } from "@/components/forms/FormField";
import { PendingButton } from "@/components/forms/PendingButton";
import { Input } from "@/components/ui/input";
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth-redirect";
import { postJson } from "@/lib/post-json";
import { registerSchema } from "@/lib/validation/auth";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";

type FieldName = "name" | "email" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELDS: {
  name: FieldName;
  label: string;
  type: string;
  autoComplete: string;
  placeholder?: string;
}[] = [
  {
    name: "name",
    label: "Name",
    type: "text",
    autoComplete: "name",
    placeholder: "Jane Doe",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    autoComplete: "email",
    placeholder: "you@example.com",
  },
  {
    name: "password",
    label: "Password",
    type: "password",
    autoComplete: "new-password",
  },
  {
    name: "confirmPassword",
    label: "Confirm password",
    type: "password",
    autoComplete: "new-password",
  },
];

export function RegisterForm() {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    // Same schema the API route runs, so the client catches the obvious
    // problems without a round trip
    const parsed = registerSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) {
      setFieldErrors(fieldErrorsFrom(parsed.error));
      return;
    }

    setPending(true);
    const result = await postJson<{ emailVerificationSkipped?: boolean }>(
      "/api/auth/register",
      parsed.data,
      "Could not create account",
    );
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    // Only the server knows whether verification was skipped, so the copy
    // follows the response rather than promising an email nobody sent.
    // Anything but an explicit true keeps the verification wording, so a
    // missing field can't turn into a promise we didn't keep.
    const skipped = result.data?.emailVerificationSkipped === true;

    // Toaster lives in the root layout, so the toast outlives this navigation
    toast.success("Account created", {
      description: skipped
        ? "You can sign in now."
        : "Check your email for a verification link — you'll need it to sign in.",
    });
    router.push("/sign-in");
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {FIELDS.map((field) => (
          <FormField
            key={field.name}
            id={field.name}
            label={field.label}
            error={fieldErrors[field.name]}
          >
            <Input
              id={field.name}
              name={field.name}
              type={field.type}
              autoComplete={field.autoComplete}
              placeholder={field.placeholder}
              {...fieldErrorProps(field.name, fieldErrors[field.name])}
            />
          </FormField>
        ))}

        <PendingButton pending={pending} type="submit" className="w-full">
          Create account
        </PendingButton>
      </form>

      <AuthDivider />

      {/* GitHub sign-in creates the account on first use, so it doubles as sign-up */}
      <GitHubButton
        callbackUrl={DEFAULT_SIGNED_IN_PATH}
        label="Sign up with GitHub"
      />
    </div>
  );
}
