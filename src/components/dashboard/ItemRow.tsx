"use client";

import { Pin } from "lucide-react";

import { CopyItemButton, isCopyable } from "@/components/items/CopyItemButton";
import { FavoriteItemButton } from "@/components/items/FavoriteItemButton";
import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import { Badge } from "@/components/ui/badge";
import { formatShortDate } from "@/lib/format-date";
import { typeColorTint } from "@/lib/type-colors";
import { cn } from "@/lib/utils";
import type { ItemSummary } from "@/types/items";

interface ItemRowProps {
  item: ItemSummary;
}

// A button rather than a link — the item detail view is a drawer, not a page.
// The favorite and copy buttons overlay the top-right corner as the row's
// siblings, since they can't nest inside the row's <button>.
export function ItemRow({ item }: ItemRowProps) {
  const { openItem } = useItemDrawer();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => openItem(item)}
        className="flex w-full cursor-pointer items-start gap-3 rounded-xl border border-l-4 bg-card p-4 text-left transition-shadow hover:ring-1 hover:ring-foreground/25"
        // subtle border all round, with a solid accent edge in the item type's color
        style={{
          borderColor: typeColorTint(item.type.color, 25),
          borderLeftColor: item.type.color,
        }}
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
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <span
          className={cn(
            "shrink-0 text-xs text-muted-foreground",
            // clear of the buttons overlaying this corner
            isCopyable(item) ? "mr-16" : "mr-7",
          )}
        >
          {formatShortDate(item.createdAt)}
        </span>
      </button>
      <div className="absolute top-2.5 right-2.5 flex gap-1">
        <FavoriteItemButton item={item} />
        <CopyItemButton item={item} />
      </div>
    </div>
  );
}
