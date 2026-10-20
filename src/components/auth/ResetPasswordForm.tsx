"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { fieldErrorProps, FormField } from "@/components/forms/FormField";
import { PendingButton } from "@/components/forms/PendingButton";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/post-json";
import { resetPasswordSchema } from "@/lib/validation/auth";

type FieldName = "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

// "New password" would be a lie for an OAuth-only account that never had one
function fields(hasPassword: boolean): { name: FieldName; label: string }[] {
  const noun = hasPassword ? "new password" : "password";
  return [
    { name: "password", label: noun.charAt(0).toUpperCase() + noun.slice(1) },
    { name: "confirmPassword", label: `Confirm ${noun}` },
  ];
}

interface ResetPasswordFormProps {
  token: string;
  /** False for an OAuth-only account setting a first password */
  hasPassword: boolean;
}

export function ResetPasswordForm({
  token,
  hasPassword,
}: ResetPasswordFormProps) {
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    // Same schema the endpoint runs. The token comes from the page rather than
    // an input, so it can't be edited in the form.
    const parsed = resetPasswordSchema.safeParse({
      ...Object.fromEntries(formData),
      token,
    });
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        // Anything not rendered as a field (the token) falls through to a toast
        if (field === "password" || field === "confirmPassword") {
          errors[field] ??= issue.message;
        } else {
          toast.error(issue.message);
        }
      }
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    const result = await postJson(
      "/api/auth/password/reset",
      parsed.data,
      "Could not update your password",
    );
    setPending(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    // The sign-in page owns the success toast, so it fires once and survives
    // a hard load of the URL as well as this soft navigation
    router.push("/sign-in?reset=1");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {fields(hasPassword).map((field) => (
        <FormField
          key={field.name}
          id={field.name}
          label={field.label}
          error={fieldErrors[field.name]}
        >
          <Input
            id={field.name}
            name={field.name}
            type="password"
            autoComplete="new-password"
            {...fieldErrorProps(field.name, fieldErrors[field.name])}
          />
        </FormField>
      ))}

      <PendingButton pending={pending} type="submit" className="w-full">
        {hasPassword ? "Update password" : "Set password"}
      </PendingButton>
    </form>
  );
}
