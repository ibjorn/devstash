"use client";

import { Pencil, Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import { EditCollectionDialog } from "@/components/collections/EditCollectionDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CollectionHeader } from "@/types/collections";

interface CollectionActionsProps {
  collection: CollectionHeader;
}

/** Favorite, Edit and Delete in the /collections/[id] header. */
export function CollectionActions({ collection }: CollectionActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => toast("Favoriting collections is coming soon")}
        aria-label="Favorite"
        title="Favorite"
      >
        <Star
          className={cn(
            "size-4",
            collection.isFavorite && "fill-yellow-400 text-yellow-400",
          )}
        />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => setEditOpen(true)}
        aria-label="Edit"
        title="Edit"
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 className="size-4" />
      </Button>

      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectTo="/collections"
      />
    </div>
  );
}
