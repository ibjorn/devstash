"use client";

import { Pencil, Trash2 } from "lucide-react";

import { FavoriteStar } from "@/components/favorites/FavoriteStar";
import { Button } from "@/components/ui/button";
import { useCollectionActions } from "@/hooks/use-collection-actions";
import type { CollectionHeader } from "@/types/collections";

interface CollectionActionsProps {
  collection: CollectionHeader;
}

/** Favorite, Edit and Delete in the /collections/[id] header. */
export function CollectionActions({ collection }: CollectionActionsProps) {
  const { isFavorite, toggleFavorite, openEdit, openDelete, dialogs } =
    useCollectionActions(collection, { redirectAfterDelete: "/collections" });

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={toggleFavorite}
        aria-pressed={isFavorite}
        aria-label="Favorite"
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      >
        <FavoriteStar active={isFavorite} className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={openEdit}
        aria-label="Edit"
        title="Edit"
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className="text-destructive hover:text-destructive"
        onClick={openDelete}
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 className="size-4" />
      </Button>

      {dialogs}
    </div>
  );
}
