import type { ItemDetail } from "@/types/items";

/** Every field `updateItem` replaces, as the client sends them. */
export interface ItemUpdatePayload {
  title: string;
  description: string | null;
  content: string | null;
  language: string | null;
  url: string | null;
  tags: string[];
  collectionIds: string[];
}

/**
 * The `updateItem` payload for a change to some of an item's fields. Editing
 * replaces every field, so anything not in `overrides` is sent back as the item
 * already has it — a partial update can never blank a column it didn't touch.
 */
export function updateInputFrom(
  detail: ItemDetail,
  overrides: Partial<ItemUpdatePayload>,
): ItemUpdatePayload {
  return {
    title: detail.title,
    description: detail.description,
    content: detail.content,
    language: detail.language,
    url: detail.url,
    tags: detail.tags,
    collectionIds: detail.collections.map((collection) => collection.id),
    ...overrides,
  };
}
