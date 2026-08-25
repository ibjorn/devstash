"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
    try {
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const result = await response.json();

      if (!response.ok) {
        toast.error(result?.error ?? "Could not update your password");
        return;
      }

      // The sign-in page owns the success toast, so it fires once and survives
      // a hard load of the URL as well as this soft navigation
      router.push("/sign-in?reset=1");
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {fields(hasPassword).map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            name={field.name}
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(fieldErrors[field.name])}
            aria-describedby={
              fieldErrors[field.name] ? `${field.name}-error` : undefined
            }
          />
          {fieldErrors[field.name] && (
            <p id={`${field.name}-error`} className="text-sm text-destructive">
              {fieldErrors[field.name]}
            </p>
          )}
        </div>
      ))}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending && <Loader2 className="size-4 animate-spin" />}
        {hasPassword ? "Update password" : "Set password"}
      </Button>
    </form>
  );
}
