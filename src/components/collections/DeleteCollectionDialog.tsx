"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { deleteCollection } from "@/actions/collections";
import { ConfirmDeleteDialog } from "@/components/dialogs/ConfirmDeleteDialog";

interface DeleteCollectionDialogProps {
  collection: { id: string; name: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where to go afterwards; omitted, the current page just refreshes
  redirectTo?: string;
}

/**
 * Confirms and deletes a collection. Its items are kept — they only stop
 * belonging to it. Controlled, like EditCollectionDialog.
 */
export function DeleteCollectionDialog({
  collection,
  open,
  onOpenChange,
  redirectTo,
}: DeleteCollectionDialogProps) {
  const router = useRouter();

  function handleDeleted() {
    toast.success(`Deleted "${collection.name}"`);
    // replace, not push: Back would land on a page that now 404s
    if (redirectTo) router.replace(redirectTo);
    // The sidebar sits in a shared layout, which navigation alone keeps as is
    router.refresh();
  }

  return (
    <ConfirmDeleteDialog
      title="Delete this collection?"
      description={
        <>
          &ldquo;{collection.name}&rdquo; will be permanently deleted. Its items
          are not deleted — they just won&apos;t be in this collection anymore.
          This cannot be undone.
        </>
      }
      action={() => deleteCollection(collection.id)}
      failed="Could not delete this collection."
      onDeleted={handleDeleted}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
}
