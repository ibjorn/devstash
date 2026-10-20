import { describe, expect, it } from "vitest";

import type { ItemDetail } from "@/types/items";

import { updateInputFrom } from "./item-update";

const DETAIL = {
  id: "item_1",
  title: "useDebounce",
  description: "A debounce hook",
  content: "export function useDebounce() {}",
  language: "typescript",
  url: null,
  tags: ["react", "hooks"],
  collections: [
    { id: "col_1", name: "React Patterns" },
    { id: "col_2", name: "Interview Prep" },
  ],
} as unknown as ItemDetail;

describe("updateInputFrom", () => {
  it("sends every field back as the item has it when nothing changes", () => {
    expect(updateInputFrom(DETAIL, {})).toEqual({
      title: "useDebounce",
      description: "A debounce hook",
      content: "export function useDebounce() {}",
      language: "typescript",
      url: null,
      tags: ["react", "hooks"],
      collectionIds: ["col_1", "col_2"],
    });
  });

  it("replaces only the fields it is given", () => {
    const input = updateInputFrom(DETAIL, { content: "rewritten" });

    expect(input.content).toBe("rewritten");
    expect(input.title).toBe("useDebounce");
    expect(input.collectionIds).toEqual(["col_1", "col_2"]);
  });

  it("lets an override clear a field", () => {
    expect(updateInputFrom(DETAIL, { description: null }).description).toBe(
      null,
    );
  });
});
