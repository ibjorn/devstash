"use client";

import { useMemo, useState } from "react";

import { FavoriteCollectionRow } from "@/components/favorites/FavoriteCollectionRow";
import { FavoriteItemRow } from "@/components/favorites/FavoriteItemRow";
import {
  DEFAULT_FAVORITE_SORT,
  FAVORITE_SORT_KEYS,
  type FavoriteSortKey,
  sortFavoriteCollections,
  sortFavoriteItems,
} from "@/lib/favorites-sort";
import { cn } from "@/lib/utils";
import type { FavoriteCollection } from "@/types/collections";
import type { FavoriteItem } from "@/types/items";

interface FavoritesListProps {
  items: FavoriteItem[];
  collections: FavoriteCollection[];
}

/** Both /favorites sections, re-sorted in the browser without refetching. */
export function FavoritesList({ items, collections }: FavoritesListProps) {
  const [sort, setSort] = useState<FavoriteSortKey>(DEFAULT_FAVORITE_SORT);
  const sortedItems = useMemo(
    () => sortFavoriteItems(items, sort),
    [items, sort],
  );
  const sortedCollections = useMemo(
    () => sortFavoriteCollections(collections, sort),
    [collections, sort],
  );

  return (
    <div className="flex flex-col gap-6 font-mono text-sm">
      <SortControl value={sort} onChange={setSort} />
      <FavoritesSection title="Items" count={items.length}>
        {sortedItems.map((item) => (
          <FavoriteItemRow key={item.id} item={item} />
        ))}
      </FavoritesSection>
      <FavoritesSection title="Collections" count={collections.length}>
        {sortedCollections.map((collection) => (
          <FavoriteCollectionRow key={collection.id} collection={collection} />
        ))}
      </FavoritesSection>
    </div>
  );
}

interface SortControlProps {
  value: FavoriteSortKey;
  onChange: (value: FavoriteSortKey) => void;
}

function SortControl({ value, onChange }: SortControlProps) {
  return (
    <div
      role="group"
      aria-label="Sort favorites"
      className="flex items-center gap-1 self-end text-xs text-muted-foreground"
    >
      <span aria-hidden="true">sort:</span>
      {FAVORITE_SORT_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={cn(
            "cursor-pointer rounded px-1.5 py-0.5 transition-colors pointer-coarse:px-2.5 pointer-coarse:py-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === key && "bg-muted text-foreground",
          )}
        >
          {key}
        </button>
      ))}
    </div>
  );
}

interface FavoritesSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

function FavoritesSection({ title, count, children }: FavoritesSectionProps) {
  return (
    <section aria-label={title}>
      <h2 className="border-b px-3 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title} <span className="tabular-nums">({count})</span>
      </h2>
      {count > 0 ? (
        <ul className="divide-y divide-border/50">{children}</ul>
      ) : (
        <p className="px-3 py-1.5 text-muted-foreground">
          No favorite {title.toLowerCase()}.
        </p>
      )}
    </section>
  );
}
