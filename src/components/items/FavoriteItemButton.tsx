"use client";

import { setItemFavorite } from "@/actions/favorites";
import { FavoriteStar } from "@/components/favorites/FavoriteStar";
import { CARD_ICON_BUTTON } from "@/components/items/card-styles";
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
      className={cn(CARD_ICON_BUTTON, className)}
    >
      <FavoriteStar active={isFavorite} className="size-4" />
    </button>
  );
}
