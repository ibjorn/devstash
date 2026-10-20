import { describe, expect, it } from "vitest";

import { isRowId } from "@/lib/validation/ids";

describe("isRowId", () => {
  it("accepts a cuid", () => {
    expect(isRowId("cmh2x9k0a0000qz8r3b1c4d5e")).toBe(true);
  });

  it("accepts an id at the 64-character cap", () => {
    expect(isRowId("a".repeat(64))).toBe(true);
  });

  it.each([
    ["an empty string", ""],
    ["an oversized string", "a".repeat(65)],
    ["undefined", undefined],
    ["null", null],
    ["a number", 42],
    ["an object", { id: "cmh2x9k0a0000qz8r3b1c4d5e" }],
  ])("rejects %s", (_label, id) => {
    expect(isRowId(id)).toBe(false);
  });
});
