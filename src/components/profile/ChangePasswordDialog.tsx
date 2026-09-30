"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { changePassword, type ProfileActionResult } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePasswordSchema } from "@/lib/validation/auth";

type FieldName = "currentPassword" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<FieldName, string>>;

const FIELDS: { name: FieldName; label: string; autoComplete: string }[] = [
  {
    name: "currentPassword",
    label: "Current password",
    autoComplete: "current-password",
  },
  { name: "password", label: "New password", autoComplete: "new-password" },
  {
    name: "confirmPassword",
    label: "Confirm new password",
    autoComplete: "new-password",
  },
];

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Don't leave last attempt's errors sitting there for the next open
    if (!next) setFieldErrors({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const form = event.currentTarget;
    const formData = new FormData(form);

    // Same schema the action runs, so an obvious mismatch costs no round trip
    const parsed = changePasswordSchema.safeParse(
      Object.fromEntries(formData),
    );
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as FieldName | undefined;
        if (field) errors[field] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setPending(true);
    let result: ProfileActionResult;
    // Only the call itself is wrapped: a throw after a successful change must
    // not toast "Could not reach the server" over a password that did update
    try {
      result = await changePassword(formData);
    } catch {
      toast.error("Could not reach the server. Please try again.");
      return;
    } finally {
      setPending(false);
    }

    if (!result.success) {
      if (result.fieldErrors) setFieldErrors(result.fieldErrors);
      if (result.error) toast.error(result.error);
      return;
    }

    form.reset();
    handleOpenChange(false);
    toast.success("Password updated");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Change password</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>
            Enter your current password, then choose a new one.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {FIELDS.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                autoComplete={field.autoComplete}
                aria-invalid={Boolean(fieldErrors[field.name])}
                aria-describedby={
                  fieldErrors[field.name] ? `${field.name}-error` : undefined
                }
              />
              {fieldErrors[field.name] && (
                <p
                  id={`${field.name}-error`}
                  className="text-sm text-destructive"
                >
                  {fieldErrors[field.name]}
                </p>
              )}
            </div>
          ))}

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />}
              Update password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
