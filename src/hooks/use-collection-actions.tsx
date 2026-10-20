"use client";

import { useState } from "react";

import { setCollectionFavorite } from "@/actions/favorites";
import { DeleteCollectionDialog } from "@/components/collections/DeleteCollectionDialog";
import {
  EditCollectionDialog,
  type EditableCollection,
} from "@/components/collections/EditCollectionDialog";
import { useFavoriteToggle } from "@/hooks/use-favorite-toggle";

interface CollectionActionsOptions {
  /** Where Delete goes afterwards; omitted, the current page just refreshes. */
  redirectAfterDelete?: string;
}

/**
 * Favorite, Edit and Delete for one collection, shared by the collection
 * page's header buttons and a card's ⋯ menu. Render `dialogs` as a sibling of
 * whatever opens them — never inside a Radix menu, where a dialog opened from
 * a closing menu can leave focus and pointer-events stuck.
 */
export function useCollectionActions(
  collection: EditableCollection & { isFavorite: boolean },
  { redirectAfterDelete }: CollectionActionsOptions = {},
) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { isFavorite, toggle } = useFavoriteToggle({
    isFavorite: collection.isFavorite,
    save: (next) => setCollectionFavorite(collection.id, next),
  });

  const dialogs = (
    <>
      <EditCollectionDialog
        collection={collection}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCollectionDialog
        collection={collection}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        redirectTo={redirectAfterDelete}
      />
    </>
  );

  return {
    isFavorite,
    toggleFavorite: toggle,
    openEdit: () => setEditOpen(true),
    openDelete: () => setDeleteOpen(true),
    dialogs,
  };
}
