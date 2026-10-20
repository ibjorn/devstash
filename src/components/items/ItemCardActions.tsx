"use client";

import { CopyItemButton, isCopyable } from "@/components/items/CopyItemButton";
import { FavoriteItemButton } from "@/components/items/FavoriteItemButton";
import { cn } from "@/lib/utils";
import type { ItemSummary } from "@/types/items";

/**
 * Right padding that keeps a card's own content clear of this overlay — two
 * buttons wide for copyable items, one otherwise. Kept beside the overlay so
 * the two can't drift apart.
 */
export function overlayClearance(item: ItemSummary): string {
  return isCopyable(item)
    ? "pr-16 pointer-coarse:pr-20"
    : "pr-7 pointer-coarse:pr-9";
}

interface ItemCardActionsProps {
  item: ItemSummary;
  className?: string;
}

/**
 * Favorite and copy, overlaying an item card's top-right corner. They're the
 * card's siblings, not its children, since a button can't nest inside the
 * card's <button>.
 */
export function ItemCardActions({ item, className }: ItemCardActionsProps) {
  return (
    <div className={cn("absolute flex gap-1", className)}>
      <FavoriteItemButton item={item} />
      <CopyItemButton item={item} />
    </div>
  );
}
