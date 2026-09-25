"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteItem, type ItemActionResult } from "@/actions/items";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ItemSummary } from "@/types/items";

interface DeleteItemDialogProps {
  item: ItemSummary;
  // Closes the drawer — the item it's showing no longer exists
  onDeleted: () => void;
}

/**
 * The drawer's Delete button and the confirmation it opens.
 */
export function DeleteItemDialog({ item, onDeleted }: DeleteItemDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  // Not closable mid-delete: dismissing would hide the outcome of a request
  // that's still going to land
  function handleOpenChange(next: boolean) {
    if (!pending) setOpen(next);
  }

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    // AlertDialogAction closes the dialog on click by default; hold it open
    // until the delete has actually succeeded
    event.preventDefault();

    setPending(true);
    let result: ItemActionResult;
    try {
      result = await deleteItem(item.id);
    } catch {
      toast.error("Could not reach the server. Please try again.");
      return;
    } finally {
      setPending(false);
    }

    if (!result.success) {
      toast.error(result.error ?? "Could not delete this item.");
      return;
    }

    // Outside the try: a throw from here on isn't a failed delete, and must
    // not be toasted as one
    setOpen(false);
    onDeleted();
    toast.success(`Deleted "${item.title}"`);
    router.refresh();
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this item?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{item.title}&rdquo; will be permanently deleted and removed
            from any collections it belongs to. This cannot be undone.
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
