import { describe, expect, it } from "vitest";

import { groupCollectionItems } from "@/lib/collection-items";
import type { ItemSummary } from "@/types/items";

function item(id: string, typeName: string): ItemSummary {
  return {
    id,
    title: id,
    description: null,
    isFavorite: false,
    isPinned: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    type: {
      id: `typ_${typeName}`,
      name: typeName,
      icon: "File",
      color: "#000",
    },
    tags: [],
    fileName: null,
    fileSize: null,
  };
}

const ids = (items: ItemSummary[]) => items.map((entry) => entry.id);

describe("groupCollectionItems", () => {
  it("puts images and files in their own groups and the rest in cards", () => {
    const groups = groupCollectionItems([
      item("snippet", "Snippet"),
      item("photo", "Image"),
      item("doc", "File"),
      item("link", "Link"),
    ]);

    expect(ids(groups.cards)).toEqual(["snippet", "link"]);
    expect(ids(groups.images)).toEqual(["photo"]);
    expect(ids(groups.files)).toEqual(["doc"]);
  });

  it("keeps the incoming order within each group", () => {
    const groups = groupCollectionItems([
      item("img2", "Image"),
      item("note", "Note"),
      item("img1", "Image"),
    ]);

    expect(ids(groups.images)).toEqual(["img2", "img1"]);
  });

  it("returns empty groups for an empty collection", () => {
    expect(groupCollectionItems([])).toEqual({
      cards: [],
      images: [],
      files: [],
    });
  });
});
