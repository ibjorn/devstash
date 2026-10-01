import { uploadKindFor } from "@/lib/uploads";
import type { ItemSummary } from "@/types/items";

export interface CollectionItemGroups {
  /** Everything without an upload, shown as regular item cards */
  cards: ItemSummary[];
  images: ItemSummary[];
  files: ItemSummary[];
}

/**
 * Splits a collection's items by how their own type page displays them, so
 * images get the gallery and files the list there too. Keeps the incoming
 * order within each group.
 */
export function groupCollectionItems(
  items: ItemSummary[],
): CollectionItemGroups {
  const groups: CollectionItemGroups = { cards: [], images: [], files: [] };
  for (const item of items) {
    const kind = uploadKindFor(item.type.name);
    if (kind === "image") groups.images.push(item);
    else if (kind === "file") groups.files.push(item);
    else groups.cards.push(item);
  }
  return groups;
}
