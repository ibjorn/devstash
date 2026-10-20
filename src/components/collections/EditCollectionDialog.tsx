"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateCollection } from "@/actions/collections";
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
} from "@/components/ui/dialog";
import { type RunAction, useActionRunner } from "@/hooks/use-action-runner";
import type { CollectionHeader } from "@/types/collections";

export type EditableCollection = Pick<
  CollectionHeader,
  "id" | "name" | "description"
>;

interface EditCollectionDialogProps {
  collection: EditableCollection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Edits a collection's name and description. Controlled, so a page button or
 * a card's dropdown item can open it without nesting it inside the menu.
 */
export function EditCollectionDialog({
  collection,
  open,
  onOpenChange,
}: EditCollectionDialogProps) {
  const { pending, run } = useActionRunner();

  // A request in flight is going to land either way; closing would only hide
  // its outcome
  function handleOpenChange(next: boolean) {
    if (!pending) onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {/* Mounted per open, so the fields start from the saved values */}
        <EditCollectionForm
          collection={collection}
          pending={pending}
          run={run}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditCollectionFormProps {
  collection: EditableCollection;
  pending: boolean;
  run: RunAction;
  onClose: () => void;
}

function EditCollectionForm({
  collection,
  pending,
  run,
  onClose,
}: EditCollectionFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<CollectionFormValues>({
    name: collection.name,
    description: collection.description ?? "",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const canSave = values.name.trim().length > 0 && !pending;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    const result = await run(() => updateCollection(collection.id, values), {
      failed: "Could not save this collection.",
      unreachable: "Could not reach the server — your changes were not saved.",
      onFieldErrors: setFieldErrors,
    });
    if (!result?.data) return;

    onClose();
    toast.success(`Saved "${result.data.name}"`);
    // Cards, the sidebar and the collection page header are server-rendered
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <DialogHeader>
        <DialogTitle>Edit collection</DialogTitle>
        <DialogDescription>
          Rename the collection or change its description.
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
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </Button>
        <PendingButton pending={pending} type="submit" disabled={!canSave}>
          Save
        </PendingButton>
      </DialogFooter>
    </form>
  );
}
