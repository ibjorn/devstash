"use client";

import { File } from "lucide-react";

import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { formatShortDate } from "@/lib/format-date";
import { typeColorTint } from "@/lib/type-colors";
import { typeIcons } from "@/lib/type-icons";
import type { FavoriteItem } from "@/types/items";

interface FavoriteItemRowProps {
  item: FavoriteItem;
}

/** One dense /favorites row for an item; clicking it opens the drawer. */
export function FavoriteItemRow({ item }: FavoriteItemRowProps) {
  const { openItem } = useItemDrawer();
  // Looked up from the table rather than through getTypeIcon, which would trip
  // react-hooks/static-components at a component's top level
  const Icon = typeIcons[item.type.icon] ?? File;

  return (
    <li>
      <button
        type="button"
        onClick={() => openItem(item)}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-1.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <Icon className="size-4 shrink-0" style={{ color: item.type.color }} />
        <span className="min-w-0 flex-1 truncate">{item.title}</span>
        <span
          className="shrink-0 rounded border px-1.5 text-xs lowercase"
          style={{
            borderColor: typeColorTint(item.type.color, 25),
            color: item.type.color,
          }}
        >
          {item.type.name}
        </span>
        <FavoriteDate date={item.updatedAt} />
      </button>
    </li>
  );
}

/** The right-hand date column, shared with the collection rows. */
export function FavoriteDate({ date }: { date: Date }) {
  return (
    <time
      dateTime={date.toISOString()}
      title={`Updated ${date.toLocaleString("en-US")}`}
      className="w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums"
    >
      {formatShortDate(date)}
    </time>
  );
}
