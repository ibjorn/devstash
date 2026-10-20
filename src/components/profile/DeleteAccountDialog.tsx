"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { deleteAccount, type ProfileActionResult } from "@/actions/profile";
import { fieldErrorProps, FormField } from "@/components/forms/FormField";
import { PendingButton } from "@/components/forms/PendingButton";
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
import { plural } from "@/lib/plural";

interface DeleteAccountDialogProps {
  email: string;
  itemCount: number;
  collectionCount: number;
  /** The user currently has Pro, which deleting ends with no refund. */
  hasPro: boolean;
}

export function DeleteAccountDialog({
  email,
  itemCount,
  collectionCount,
  hasPro,
}: DeleteAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  // Compared the way the server compares it, so casing and stray whitespace
  // don't block a correct entry
  const matches = confirmation.trim().toLowerCase() === email.toLowerCase();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setConfirmation("");
      setFieldError(undefined);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(undefined);

    setPending(true);
    try {
      // Typed as possibly-undefined on purpose: a successful delete signs out
      // and redirects, and Next serialises no return value for a redirecting
      // action — so `result` really is undefined on the happy path, and
      // dereferencing it would throw into the catch below and toast a failure
      // over a deletion that worked.
      const result: ProfileActionResult | undefined = await deleteAccount(
        new FormData(event.currentTarget),
      );
      if (!result) return;

      if (result.fieldErrors?.confirmEmail) {
        setFieldError(result.fieldErrors.confirmEmail);
        return;
      }
      if (result.error) toast.error(result.error);
    } catch {
      toast.error("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete account</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete account</DialogTitle>
          <DialogDescription>
            This permanently deletes your account along with{" "}
            {plural(itemCount, "item")} and{" "}
            {plural(collectionCount, "collection")}. It cannot be undone.
            {hasPro &&
              " It also cancels your Pro subscription immediately, and the rest of the paid period is forfeited."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <FormField
            id="confirmEmail"
            label={
              <>
                Type <span className="font-mono">{email}</span> to confirm
              </>
            }
            error={fieldError}
          >
            <Input
              id="confirmEmail"
              name="confirmEmail"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              {...fieldErrorProps("confirmEmail", fieldError)}
            />
          </FormField>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <PendingButton
              pending={pending}
              type="submit"
              variant="destructive"
              disabled={!matches}
            >
              Delete account
            </PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
