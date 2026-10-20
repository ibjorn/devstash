"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type MouseEvent } from "react";
import { toast } from "sonner";

import { deleteCollection } from "@/actions/collections";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useActionRunner } from "@/hooks/use-action-runner";

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
  const { pending, run } = useActionRunner();

  // Not closable mid-delete: dismissing would hide the outcome of a request
  // that's still going to land
  function handleOpenChange(next: boolean) {
    if (!pending) onOpenChange(next);
  }

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    // AlertDialogAction closes the dialog on click by default; hold it open
    // until the delete has actually succeeded
    event.preventDefault();

    const result = await run(() => deleteCollection(collection.id), {
      failed: "Could not delete this collection.",
    });
    if (!result) return;

    onOpenChange(false);
    toast.success(`Deleted "${collection.name}"`);
    // replace, not push: Back would land on a page that now 404s
    if (redirectTo) router.replace(redirectTo);
    // The sidebar sits in a shared layout, which navigation alone keeps as is
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this collection?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{collection.name}&rdquo; will be permanently deleted. Its
            items are not deleted — they just won&apos;t be in this collection
            anymore. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
