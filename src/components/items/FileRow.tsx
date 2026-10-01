"use client";

import { Download, Pin } from "lucide-react";

import { FavoriteItemButton } from "@/components/items/FavoriteItemButton";
import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import { fileIconFor } from "@/lib/file-icons";
import { formatShortDate } from "@/lib/format-date";
import { formatBytes } from "@/lib/uploads";
import type { ItemSummary } from "@/types/items";

interface FileRowProps {
  item: ItemSummary;
}

/**
 * A File item in the /items/files list. The row opens the drawer; the
 * favorite button and Download link sit beside that button rather than inside
 * it — a control nested in a <button> is invalid HTML and screen readers
 * flatten it — so their clicks never reach the drawer in the first place.
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
        <ItemTypeIcon
          type={item.type}
          size="sm"
          icon={fileIconFor(item.fileName)}
        />

        {/* Stacked on mobile; name, size and date in columns from sm up */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <span className="truncate text-sm font-medium">{name}</span>
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

      <FavoriteItemButton item={item} />
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
