import type { ItemSummary } from "@/types/items";

/**
 * An item as the command palette searches it: the summary the drawer opens
 * from, plus a short excerpt of its content (or URL) to match against.
 */
export interface SearchItem extends ItemSummary {
  preview: string | null;
}

/** A collection as the command palette lists it. */
export interface SearchCollection {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
}

export interface SearchData {
  items: SearchItem[];
  collections: SearchCollection[];
}

/** SearchData after JSON — `createdAt` arrives as an ISO string. */
export interface SearchDataResponse {
  items: (Omit<SearchItem, "createdAt"> & { createdAt: string })[];
  collections: SearchCollection[];
}
