"use client";

import { createElement } from "react";
import { Download, Pin, Star } from "lucide-react";

import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { fileIconFor } from "@/lib/file-icons";
import { formatShortDate } from "@/lib/format-date";
import { typeColorTint } from "@/lib/type-colors";
import { formatBytes } from "@/lib/uploads";
import type { ItemSummary } from "@/types/items";

interface FileRowProps {
  item: ItemSummary;
}

/**
 * A File item in the /items/files list. The row opens the drawer and the
 * Download link sits beside that button rather than inside it — a link nested
 * in a <button> is invalid HTML and screen readers flatten it — so a download
 * click never reaches the drawer in the first place.
 */
export function FileRow({ item }: FileRowProps) {
  const { openItem } = useItemDrawer();
  const name = item.fileName ?? item.title;
  const size = item.fileSize !== null ? formatBytes(item.fileSize) : "—";
  const date = formatShortDate(item.createdAt);

  return (
    <li className="flex items-center gap-2 pr-3 transition-colors hover:bg-muted/50">
      <button
        type="button"
        onClick={() => openItem(item)}
        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-3 pl-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          // icon chip tinted with the item type's color
          style={{
            backgroundColor: typeColorTint(item.type.color, 10),
            color: item.type.color,
          }}
        >
          {/* createElement rather than a local <Icon>: the lookup returns a
              component, which react-hooks/static-components rejects as JSX */}
          {createElement(fileIconFor(item.fileName), { className: "size-4" })}
        </div>

        {/* Stacked on mobile; name, size and date in columns from sm up */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="truncate text-sm font-medium">{name}</span>
            {item.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
            {item.isPinned && (
              <Pin className="size-3.5 shrink-0 text-muted-foreground" />
            )}
          </div>
          <span className="text-xs text-muted-foreground sm:hidden">
            {size} · {date}
          </span>
          <span className="hidden w-20 shrink-0 text-right text-sm text-muted-foreground tabular-nums sm:block">
            {size}
          </span>
          <span className="hidden w-16 shrink-0 text-right text-sm text-muted-foreground sm:block">
            {date}
          </span>
        </div>
      </button>

      <a
        href={`/api/items/${encodeURIComponent(item.id)}/file?download=1`}
        download
        aria-label={`Download ${name}`}
        title="Download"
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Download className="size-4" />
      </a>
    </li>
  );
}
