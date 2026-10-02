import { Folder } from "lucide-react";
import Link from "next/link";

import { FavoriteDate } from "@/components/favorites/FavoriteItemRow";
import type { FavoriteCollection } from "@/types/collections";

interface FavoriteCollectionRowProps {
  collection: FavoriteCollection;
}

/** One dense /favorites row for a collection; links to its page. */
export function FavoriteCollectionRow({
  collection,
}: FavoriteCollectionRowProps) {
  const count = collection.itemCount;

  return (
    <li>
      <Link
        href={`/collections/${encodeURIComponent(collection.id)}`}
        className="flex w-full items-center gap-3 px-3 py-1.5 transition-colors pointer-coarse:py-2.5 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <Folder className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{collection.name}</span>
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {count} {count === 1 ? "item" : "items"}
        </span>
        <span className="shrink-0 rounded border px-1.5 text-xs text-muted-foreground">
          collection
        </span>
        <FavoriteDate date={collection.updatedAt} />
      </Link>
    </li>
  );
}
