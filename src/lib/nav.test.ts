import { describe, expect, it } from "vitest";

import { isActivePath } from "@/lib/nav";

describe("isActivePath", () => {
  it("matches the exact path", () => {
    expect(isActivePath("/items/snippets", "/items/snippets")).toBe(true);
  });

  it("matches nested routes by prefix", () => {
    expect(isActivePath("/favorites/items", "/favorites")).toBe(true);
  });

  it("does not match a sibling that shares a prefix", () => {
    expect(isActivePath("/items/snippets-old", "/items/snippets")).toBe(false);
  });

  it("ignores nested routes when exact", () => {
    expect(
      isActivePath("/collections/abc", "/collections", { exact: true }),
    ).toBe(false);
    expect(isActivePath("/collections", "/collections", { exact: true })).toBe(
      true,
    );
  });

  it("does not match unrelated paths", () => {
    expect(isActivePath("/dashboard", "/favorites")).toBe(false);
  });
});
