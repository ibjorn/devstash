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

interface ItemRowProps {
  item: ItemSummary;
}

// A button rather than a link — the item detail view is a drawer, not a page
export function ItemRow({ item }: ItemRowProps) {
  const { openItem } = useItemDrawer();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => openItem(item)}
        className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-l-4 bg-card p-4 text-left transition-shadow hover:ring-1 hover:ring-foreground/25"
        style={itemBorderStyle(item.type, { accent: true })}
      >
        <ItemTypeIcon type={item.type} size="sm" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{item.title}</span>
            {item.isPinned && (
              <Pin className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </div>
          {item.description && (
            <p className="truncate text-sm text-muted-foreground">
              {item.description}
            </p>
          )}
          <ItemTagList tags={item.tags} />
        </div>
        <span
          className={cn(
            "shrink-0 text-xs text-muted-foreground",
            overlayClearance(item),
          )}
        >
          {formatShortDate(item.createdAt)}
        </span>
      </button>
      <ItemCardActions item={item} className="top-2.5 right-2.5" />
    </div>
  );
}
