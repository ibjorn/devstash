import { describe, expect, it } from "vitest";

import { plural } from "./plural";

describe("plural", () => {
  it("keeps the noun singular for exactly one", () => {
    expect(plural(1, "item")).toBe("1 item");
  });

  it("adds an s for zero and for more than one", () => {
    expect(plural(0, "item")).toBe("0 items");
    expect(plural(2, "collection")).toBe("2 collections");
  });
});
