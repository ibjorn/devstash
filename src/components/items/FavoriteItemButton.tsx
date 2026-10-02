"use client";

import { Star } from "lucide-react";

import { setItemFavorite } from "@/actions/favorites";
import { useFavoriteToggle } from "@/hooks/use-favorite-toggle";
import { cn } from "@/lib/utils";
import type { ItemSummary } from "@/types/items";

interface FavoriteItemButtonProps {
  item: Pick<ItemSummary, "id" | "title" | "isFavorite">;
  className?: string;
}

/**
 * The star toggle on an item card. Like CopyItemButton it overlays the card as
 * a sibling of the card's <button>, never inside it, so a click here never
 * opens the drawer. Always visible (muted when off) rather than hover-only, so
 * it works on touch screens too.
 */
export function FavoriteItemButton({
  item,
  className,
}: FavoriteItemButtonProps) {
  const { isFavorite, toggle } = useFavoriteToggle({
    isFavorite: item.isFavorite,
    save: (next) => setItemFavorite(item.id, next),
  });

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isFavorite}
      aria-label={`Favorite ${item.title}`}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
      className={cn(
        "flex size-8 shrink-0 cursor-pointer pointer-coarse:size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Star
        className={cn(
          "size-4",
          isFavorite && "fill-yellow-400 text-yellow-400",
        )}
      />
    </button>
  );
}
