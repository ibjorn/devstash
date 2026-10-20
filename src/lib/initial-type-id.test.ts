import { describe, expect, it } from "vitest";

import { initialTypeId } from "./initial-type-id";

const TYPES = [
  { id: "t_snippet", slug: "snippets" },
  { id: "t_prompt", slug: "prompts" },
  { id: "t_command", slug: "commands" },
];

describe("initialTypeId", () => {
  it("starts on the type of the /items page it was opened from", () => {
    expect(initialTypeId(TYPES, "/items/prompts")).toBe("t_prompt");
  });

  it("ignores anything after the slug", () => {
    expect(initialTypeId(TYPES, "/items/commands/whatever")).toBe("t_command");
  });

  it("matches the slug case-insensitively and URL-decoded", () => {
    expect(initialTypeId(TYPES, "/items/%50rompts")).toBe("t_prompt");
    expect(initialTypeId(TYPES, "/items/PROMPTS")).toBe("t_prompt");
  });

  it("falls back to the first type off an /items page", () => {
    expect(initialTypeId(TYPES, "/dashboard")).toBe("t_snippet");
    expect(initialTypeId(TYPES, "/collections/items/prompts")).toBe(
      "t_snippet",
    );
  });

  it("falls back to the first type for an unknown slug", () => {
    expect(initialTypeId(TYPES, "/items/nope")).toBe("t_snippet");
  });

  it("returns undefined when there are no types", () => {
    expect(initialTypeId([], "/items/prompts")).toBeUndefined();
  });
});
