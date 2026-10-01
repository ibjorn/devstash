"use client";

import { MoreHorizontal, Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import {
  EditCollectionDialog,
  type EditableCollection,
} from "@/components/collections/EditCollectionDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface CollectionCardMenuProps {
  collection: EditableCollection & { isFavorite: boolean };
  className?: string;
}

/**
 * A collection card's ⋯ menu. Rendered beside the card's link rather than
 * inside it, so opening it never navigates. The dialogs are siblings of the
 * menu, not its children: a dialog opened from inside a closing Radix menu
 * can leave focus and pointer-events stuck.
 */
export function CollectionCardMenu({
  collection,
  className,
}: CollectionCardMenuProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={`Actions for ${collection.name}`}
          title="Actions"
          className={cn(
            "flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent data-[state=open]:text-foreground",
            className,
          )}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => toast("Favoriting collections is coming soon")}
          >
            <Star
              className={cn(
                collection.isFavorite && "fill-yellow-400 text-yellow-400",
              )}
            />
            Favorite
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
