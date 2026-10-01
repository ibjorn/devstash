import { describe, expect, it } from "vitest";

import {
  sortFavoriteCollections,
  sortFavoriteItems,
} from "@/lib/favorites-sort";
import type { FavoriteCollection } from "@/types/collections";
import type { FavoriteItem } from "@/types/items";

function item(
  id: string,
  title: string,
  typeName: string,
  updatedAt: string,
): FavoriteItem {
  return {
    id,
    title,
    description: null,
    isFavorite: true,
    isPinned: false,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date(updatedAt),
    type: { id: `t-${typeName}`, name: typeName, icon: "Code", color: "#000" },
    tags: [],
    fileName: null,
    fileSize: null,
  };
}

function collection(
  id: string,
  name: string,
  updatedAt: string,
): FavoriteCollection {
  return { id, name, itemCount: 0, updatedAt: new Date(updatedAt) };
}

const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

describe("sortFavoriteItems", () => {
  const items = [
    item("a", "zsh aliases", "Command", "2026-03-01"),
    item("b", "Item 10", "Snippet", "2026-05-01"),
    item("c", "item 2", "Note", "2026-04-01"),
    item("d", "API prompt", "Prompt", "2026-02-01"),
  ];

  it("sorts by name A→Z, ignoring case and comparing numbers numerically", () => {
    expect(ids(sortFavoriteItems(items, "name"))).toEqual(["d", "c", "b", "a"]);
  });

  it("sorts by date, newest first", () => {
    expect(ids(sortFavoriteItems(items, "date"))).toEqual(["b", "c", "a", "d"]);
  });

  it("sorts by type name, then by title within a type", () => {
    const mixed = [
      item("a", "beta", "Snippet", "2026-01-01"),
      item("b", "alpha", "Snippet", "2026-01-02"),
      item("c", "zed", "Command", "2026-01-03"),
    ];
    expect(ids(sortFavoriteItems(mixed, "type"))).toEqual(["c", "b", "a"]);
  });

  it("breaks name ties by id so the order is stable", () => {
    const twins = [
      item("y", "Same", "Note", "2026-01-01"),
      item("x", "same", "Note", "2026-01-01"),
    ];
    expect(ids(sortFavoriteItems(twins, "name"))).toEqual(["x", "y"]);
  });

  it("breaks date ties by id descending, matching the server order", () => {
    const twins = [
      item("x", "One", "Note", "2026-01-01"),
      item("y", "Two", "Note", "2026-01-01"),
    ];
    expect(ids(sortFavoriteItems(twins, "date"))).toEqual(["y", "x"]);
  });

  it("does not mutate the input", () => {
    const before = ids(items);
    sortFavoriteItems(items, "name");
    expect(ids(items)).toEqual(before);
  });
});

describe("sortFavoriteCollections", () => {
  const collections = [
    collection("a", "Python Snippets", "2026-01-01"),
    collection("b", "AI Prompts", "2026-03-01"),
    collection("c", "react patterns", "2026-02-01"),
  ];

  it("sorts by name A→Z, ignoring case", () => {
    expect(ids(sortFavoriteCollections(collections, "name"))).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("sorts by date, newest first", () => {
    expect(ids(sortFavoriteCollections(collections, "date"))).toEqual([
      "b",
      "c",
      "a",
    ]);
  });

  it("falls back to name order under type, since collections have none", () => {
    expect(ids(sortFavoriteCollections(collections, "type"))).toEqual(
      ids(sortFavoriteCollections(collections, "name")),
    );
  });
});
