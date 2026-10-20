"use client";

import { Pin } from "lucide-react";

import { itemBorderStyle } from "@/components/items/card-styles";
import {
  ItemCardActions,
  overlayClearance,
} from "@/components/items/ItemCardActions";
import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { ItemTagList } from "@/components/items/ItemTagList";
import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import { formatShortDate } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import type { ItemSummary } from "@/types/items";

interface ItemCardProps {
  item: ItemSummary;
}

/**
 * An item in the /items/[type] grid. The dashboard's ItemRow is the same
 * information laid out horizontally for a single-column list; this is the
 * taller shape a two-column grid wants, sharing its type-colour treatment.
 *
 * A button rather than a link — the item detail view is a drawer, not a page.
 */
export function ItemCard({ item }: ItemCardProps) {
  const { openItem } = useItemDrawer();

  return (
    <div className="relative h-full">
      <button
        type="button"
        onClick={() => openItem(item)}
        className="flex h-full w-full cursor-pointer flex-col gap-3 rounded-xl border border-l-4 bg-card p-4 text-left transition-shadow hover:ring-1 hover:ring-foreground/25"
        style={itemBorderStyle(item.type, { accent: true })}
      >
        <div className="flex items-start justify-between gap-2">
          <ItemTypeIcon type={item.type} size="sm" />
          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5 pt-1",
              overlayClearance(item),
            )}
          >
            {item.isPinned && (
              <Pin className="size-3.5 text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="truncate text-sm font-medium">{item.title}</h3>
          {item.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-end justify-between gap-2">
          <ItemTagList tags={item.tags} className="min-w-0" />
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {formatShortDate(item.createdAt)}
          </span>
        </div>
      </button>
      <ItemCardActions item={item} className="top-3 right-3" />
    </div>
  );
}
