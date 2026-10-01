import type { FavoriteCollection } from "@/types/collections";
import type { FavoriteItem } from "@/types/items";

export const FAVORITE_SORT_KEYS = ["name", "date", "type"] as const;

export type FavoriteSortKey = (typeof FAVORITE_SORT_KEYS)[number];

// Matches the server's [updatedAt, id] desc order, so the first render is unchanged
export const DEFAULT_FAVORITE_SORT: FavoriteSortKey = "date";

// A fixed locale rather than the runtime default, so the server render of the
// client list and the browser agree on the order
const collator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});

interface Sortable {
  id: string;
  name: string;
  updatedAt: Date;
  // Collections have no item type; under "type" they fall back to name order
  typeName?: string;
}

function compareByName(a: Sortable, b: Sortable): number {
  return collator.compare(a.name, b.name) || collator.compare(a.id, b.id);
}

function compareByDate(a: Sortable, b: Sortable): number {
  // Newest first, then id desc — the same tiebreak the server query uses
  return (
    b.updatedAt.getTime() - a.updatedAt.getTime() ||
    (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
  );
}

function compareByType(a: Sortable, b: Sortable): number {
  return (
    collator.compare(a.typeName ?? "", b.typeName ?? "") || compareByName(a, b)
  );
}

const COMPARATORS: Record<
  FavoriteSortKey,
  (a: Sortable, b: Sortable) => number
> = { name: compareByName, date: compareByDate, type: compareByType };

function sortBy<T>(
  rows: readonly T[],
  key: FavoriteSortKey,
  toSortable: (row: T) => Sortable,
): T[] {
  const compare = COMPARATORS[key];
  return rows
    .map((row) => ({ row, sortable: toSortable(row) }))
    .sort((a, b) => compare(a.sortable, b.sortable))
    .map(({ row }) => row);
}

/** Returns a sorted copy; the input is left untouched. */
export function sortFavoriteItems(
  items: readonly FavoriteItem[],
  key: FavoriteSortKey,
): FavoriteItem[] {
  return sortBy(items, key, (item) => ({
    id: item.id,
    name: item.title,
    updatedAt: item.updatedAt,
    typeName: item.type.name,
  }));
}

/** Returns a sorted copy; under "type" collections sort by name. */
export function sortFavoriteCollections(
  collections: readonly FavoriteCollection[],
  key: FavoriteSortKey,
): FavoriteCollection[] {
  return sortBy(collections, key, (collection) => ({
    id: collection.id,
    name: collection.name,
    updatedAt: collection.updatedAt,
  }));
}
