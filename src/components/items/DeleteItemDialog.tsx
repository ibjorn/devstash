"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteItem } from "@/actions/items";
import { ConfirmDeleteDialog } from "@/components/dialogs/ConfirmDeleteDialog";
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

  function handleDeleted() {
    onDeleted();
    toast.success(`Deleted "${item.title}"`);
    router.refresh();
  }

  return (
    <ConfirmDeleteDialog
      title="Delete this item?"
      description={
        <>
          &ldquo;{item.title}&rdquo; will be permanently deleted and removed
          from any collections it belongs to. This cannot be undone.
        </>
      }
      action={() => deleteItem(item.id)}
      failed="Could not delete this item."
      onDeleted={handleDeleted}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete</span>
        </Button>
      }
    />
  );
}
