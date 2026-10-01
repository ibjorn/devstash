"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  type CollectionActionResult,
  updateCollection,
} from "@/actions/collections";
import {
  CollectionFormFields,
  type CollectionFormValues,
} from "@/components/collections/CollectionFormFields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [pending, setPending] = useState(false);

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
          onPendingChange={setPending}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface EditCollectionFormProps {
  collection: EditableCollection;
  pending: boolean;
  onPendingChange: (pending: boolean) => void;
  onClose: () => void;
}

function EditCollectionForm({
  collection,
  pending,
  onPendingChange,
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

    onPendingChange(true);
    setFieldErrors({});

    // Only the action call is inside the try, so a throw in the success
    // handling below can't be reported as "not saved"
    let result: CollectionActionResult<CollectionHeader>;
    try {
      result = await updateCollection(collection.id, values);
    } catch {
      toast.error("Could not reach the server — your changes were not saved.");
      return;
    } finally {
      onPendingChange(false);
    }

    if (!result.success || !result.data) {
      setFieldErrors(result.fieldErrors ?? {});
      if (result.error) {
        toast.error(result.error);
      } else if (!result.fieldErrors) {
        toast.error("Could not save this collection.");
      }
      return;
    }

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
        <Button type="submit" disabled={!canSave}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Save
        </Button>
      </DialogFooter>
    </form>
  );
}
