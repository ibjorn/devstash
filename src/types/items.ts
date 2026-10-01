import type { ItemContentType } from "@/generated/prisma/client";

export interface ItemTypeNavItem {
  id: string;
  // pluralized for display, e.g. "Snippets"; slug is its lowercase form for /items/[slug]
  name: string;
  slug: string;
  icon: string;
  color: string;
  count: number;
  // Pro-only system types (File, Image) get a PRO badge in the sidebar
  isPro: boolean;
}

/**
 * A type the New Item dialog offers. `name` is singular ("Snippet") — the
 * dialog decides which fields to show from it and `contentType` — while `slug`
 * matches the /items/[slug] the sidebar links to, so the dialog can preselect
 * the type of the page it was opened from.
 */
export interface CreatableItemType {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  contentType: ItemContentType;
}

export interface ItemTypeSummary {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ItemSummary {
  id: string;
  title: string;
  description: string | null;
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: Date;
  type: ItemTypeSummary;
  tags: string[];
  // Set only on File and Image items — the file list shows both on each row
  fileName: string | null;
  fileSize: number | null;
}

/** The toggles an item card or the drawer can flip without opening edit mode. */
export type ItemFlags = Partial<Pick<ItemSummary, "isFavorite" | "isPinned">>;

/** A favorited item on /favorites, which sorts and dates rows by updatedAt. */
export interface FavoriteItem extends ItemSummary {
  updatedAt: Date;
}

/**
 * A type-filtered listing for /items/[type]. `type` is null when the slug
 * matches no item type the user can see — the page still renders, with an
 * empty state, rather than 404ing.
 */
export interface ItemTypeListing {
  type: ItemTypeSummary | null;
  // One page of the type's items; `total` counts all of them
  items: ItemSummary[];
  total: number;
}

export interface ItemCollectionSummary {
  id: string;
  name: string;
}

/**
 * Everything the item drawer shows. Extends the card-level summary the listing
 * pages already hold with the fields only the drawer needs, so the drawer can
 * paint its header from the summary while this is still in flight.
 */
export interface ItemDetail extends ItemSummary {
  content: string | null;
  contentType: ItemContentType;
  url: string | null;
  fileUrl: string | null;
  language: string | null;
  updatedAt: Date;
  collections: ItemCollectionSummary[];
}

/**
 * ItemDetail as it survives JSON — `GET /api/items/[id]` serializes the two
 * dates to ISO strings, so the client parses them back rather than pretending
 * they arrived as Dates.
 */
export type ItemDetailResponse = Omit<ItemDetail, "createdAt" | "updatedAt"> & {
  createdAt: string;
  updatedAt: string;
};
