"use client";

import { Pin } from "lucide-react";

import { FavoriteItemButton } from "@/components/items/FavoriteItemButton";
import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { typeColorTint } from "@/lib/type-colors";
import type { ItemSummary } from "@/types/items";

interface ImageCardProps {
  item: ItemSummary;
}

/**
 * An Image item in the /items/images gallery: a 16:9 thumbnail that fills the
 * card (cropping edges if it must), with the title underneath. The drawer it
 * opens shows the whole image uncropped, plus the download.
 *
 * There are no generated thumbnails, so each card loads the original through
 * the owner-checked file proxy — lazily, since a gallery can be long.
 */
export function ImageCard({ item }: ImageCardProps) {
  const { openItem } = useItemDrawer();
  const src = `/api/items/${encodeURIComponent(item.id)}/file`;

  return (
    // The favorite button overlays the footer as the card's sibling, since it
    // can't nest inside the card's <button>
    <div className="relative">
      <button
        type="button"
        onClick={() => openItem(item)}
        className="group flex w-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-card text-left transition-shadow hover:ring-1 hover:ring-foreground/25"
        // same subtle type-tinted border the other item cards use
        style={{ borderColor: typeColorTint(item.type.color, 25) }}
      >
        <div className="aspect-video w-full overflow-hidden bg-muted/40">
          {/* A plain <img>: the file proxy needs the session cookie, and
            next/image's optimiser fetches server-side without it */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={item.title}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>

        {/* pr-12 keeps the title and pin clear of the favorite button */}
        <div className="flex items-center justify-between gap-2 py-2.5 pr-12 pl-3">
          <h3 className="truncate text-sm font-medium">{item.title}</h3>
          <div className="flex shrink-0 items-center gap-1.5">
            {item.isPinned && (
              <Pin className="size-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
      </button>
      <FavoriteItemButton item={item} className="absolute right-2 bottom-1" />
    </div>
  );
}
