"use client";

import { FolderPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createCollection } from "@/actions/collections";
import {
  CollectionFormFields,
  type CollectionFormValues,
} from "@/components/collections/CollectionFormFields";
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
import { useActionRunner } from "@/hooks/use-action-runner";

const EMPTY_VALUES: CollectionFormValues = { name: "", description: "" };

/** The top bar's New Collection button and the dialog it opens. */
export function NewCollectionDialog() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<CollectionFormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { pending, run } = useActionRunner(() => setOpen(false));

  const canSave = values.name.trim().length > 0 && !pending;

  function handleOpenChange(next: boolean) {
    // A request in flight is going to land either way; closing would only
    // hide its outcome
    if (pending) return;
    if (next) {
      setValues(EMPTY_VALUES);
      setFieldErrors({});
    }
    setOpen(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    const result = await run(() => createCollection(values), {
      failed: "Could not create this collection.",
      unreachable:
        "Could not reach the server — the collection was not created.",
      onFieldErrors: setFieldErrors,
    });
    if (!result?.data) return;

    setOpen(false);
    toast.success(`Created "${result.data.name}"`);
    // The collections grid, stats and sidebar are server-rendered
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="size-4" />
          {/* Icon-only until lg: from md the docked sidebar takes 256px of the
            top bar, so the labels don't fit at tablet widths either */}
          <span className="sr-only lg:not-sr-only">New Collection</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>New collection</DialogTitle>
            <DialogDescription>
              Group related items together. An item can belong to more than one
              collection.
            </DialogDescription>
          </DialogHeader>

          <CollectionFormFields
            values={values}
            onChange={setValues}
            fieldErrors={fieldErrors}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <PendingButton pending={pending} type="submit" disabled={!canSave}>
              Create
            </PendingButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
