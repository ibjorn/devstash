"use client";

import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import type { EditableCollection } from "@/components/collections/EditCollectionDialog";
import { FavoriteStar } from "@/components/favorites/FavoriteStar";
import { CARD_ICON_BUTTON } from "@/components/items/card-styles";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCollectionActions } from "@/hooks/use-collection-actions";
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
  const { isFavorite, toggleFavorite, openEdit, openDelete, dialogs } =
    useCollectionActions(collection);

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger
          aria-label={`Actions for ${collection.name}`}
          title="Actions"
          className={cn(
            CARD_ICON_BUTTON,
            "data-[state=open]:bg-accent data-[state=open]:text-foreground",
            className,
          )}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={openEdit}>
            <Pencil />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={toggleFavorite}>
            <FavoriteStar active={isFavorite} />
            {isFavorite ? "Unfavorite" : "Favorite"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={openDelete}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialogs}
    </>
  );
}
