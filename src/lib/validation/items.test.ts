import { describe, expect, it } from "vitest";

import {
  normalizeTags,
  parseTagInput,
  updateItemSchema,
} from "@/lib/validation/items";

const base = {
  title: "useAuth Hook",
  description: null,
  content: null,
  url: null,
  language: null,
  tags: [],
};

function firstError(result: ReturnType<typeof updateItemSchema.safeParse>) {
  return result.success ? null : result.error.issues[0].message;
}

describe("updateItemSchema", () => {
  it("requires a title with something in it", () => {
    expect(updateItemSchema.safeParse({ ...base, title: "" }).success).toBe(
      false,
    );
    // Whitespace is not a title either — it trims before the length check
    expect(
      firstError(updateItemSchema.safeParse({ ...base, title: "   " })),
    ).toBe("Title is required");
  });

  it("trims the title it stores", () => {
    const result = updateItemSchema.safeParse({
      ...base,
      title: "  useAuth Hook  ",
    });

    expect(result.success && result.data.title).toBe("useAuth Hook");
  });

  it("turns an emptied optional field into null rather than an empty string", () => {
    const result = updateItemSchema.safeParse({
      ...base,
      description: "",
      content: "   ",
      language: "",
    });

    expect(result.success && result.data).toMatchObject({
      description: null,
      content: null,
      language: null,
    });
  });

  it("accepts a real URL and rejects a bare word", () => {
    expect(
      updateItemSchema.safeParse({ ...base, url: "https://docs.docker.com/" })
        .success,
    ).toBe(true);
    expect(updateItemSchema.safeParse({ ...base, url: "docker" }).success).toBe(
      false,
    );
  });

  it("treats an emptied URL as clearing the field, not as an invalid URL", () => {
    const result = updateItemSchema.safeParse({ ...base, url: "" });

    expect(result.success && result.data.url).toBeNull();
  });

  it("bounds every free-text field", () => {
    expect(
      updateItemSchema.safeParse({ ...base, title: "x".repeat(201) }).success,
    ).toBe(false);
    expect(
      updateItemSchema.safeParse({ ...base, description: "x".repeat(1001) })
        .success,
    ).toBe(false);
    expect(
      updateItemSchema.safeParse({ ...base, content: "x".repeat(100_001) })
        .success,
    ).toBe(false);
    expect(
      updateItemSchema.safeParse({ ...base, language: "x".repeat(51) }).success,
    ).toBe(false);
  });

  it("counts tags after normalising, so duplicates don't spend a slot", () => {
    // 20 distinct names plus a casing duplicate of one of them
    const tags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
    const result = updateItemSchema.safeParse({
      ...base,
      tags: [...tags, "TAG0"],
    });

    expect(result.success && result.data.tags).toHaveLength(20);
    expect(
      updateItemSchema.safeParse({ ...base, tags: [...tags, "extra"] }).success,
    ).toBe(false);
  });

  it("rejects an overlong single tag", () => {
    expect(
      updateItemSchema.safeParse({ ...base, tags: ["x".repeat(51)] }).success,
    ).toBe(false);
  });

  it("defaults the optional fields when they are absent entirely", () => {
    const result = updateItemSchema.safeParse({ title: "Just a title" });

    expect(result.success && result.data).toEqual({
      title: "Just a title",
      description: null,
      content: null,
      url: null,
      language: null,
      tags: [],
    });
  });
});

describe("normalizeTags", () => {
  it("trims, drops blanks and keeps the order typed", () => {
    expect(normalizeTags([" react ", "", "  ", "hooks"])).toEqual([
      "react",
      "hooks",
    ]);
  });

  it("de-duplicates case-insensitively but keeps the casing typed", () => {
    // Tags are unique per user in the database, so sending both would be two
    // connectOrCreate writes racing for one row
    expect(normalizeTags(["React", "react", "REACT"])).toEqual(["React"]);
  });
});

describe("parseTagInput", () => {
  it("splits the drawer's comma-separated input", () => {
    expect(parseTagInput("react, hooks , typescript")).toEqual([
      "react",
      "hooks",
      "typescript",
    ]);
  });

  it("reads an emptied input as no tags", () => {
    expect(parseTagInput("")).toEqual([]);
    expect(parseTagInput("  ,  , ")).toEqual([]);
  });
});
