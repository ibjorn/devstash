import { describe, expect, it } from "vitest";

import { createCollectionSchema } from "@/lib/validation/collections";

describe("createCollectionSchema", () => {
  it("trims the name and description", () => {
    expect(
      createCollectionSchema.parse({
        name: "  React Patterns  ",
        description: "  Hooks and HOCs  ",
      }),
    ).toEqual({ name: "React Patterns", description: "Hooks and HOCs" });
  });

  it("requires a name, including one that is only whitespace", () => {
    for (const name of [undefined, "", "   "]) {
      const result = createCollectionSchema.safeParse({ name });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0].message).toBe("Name is required");
    }
  });

  it("caps the name at 100 characters", () => {
    expect(
      createCollectionSchema.safeParse({ name: "a".repeat(100) }).success,
    ).toBe(true);
    expect(
      createCollectionSchema.safeParse({ name: "a".repeat(101) }).success,
    ).toBe(false);
  });

  it("treats an empty or missing description as null", () => {
    for (const description of [undefined, null, "", "   "]) {
      expect(
        createCollectionSchema.parse({ name: "Notes", description })
          .description,
      ).toBeNull();
    }
  });

  it("caps the description at 1000 characters", () => {
    expect(
      createCollectionSchema.safeParse({
        name: "Notes",
        description: "a".repeat(1001),
      }).success,
    ).toBe(false);
  });

  it("drops fields it doesn't know, such as a caller-supplied userId", () => {
    expect(
      createCollectionSchema.parse({ name: "Notes", userId: "usr_other" }),
    ).toEqual({ name: "Notes", description: null });
  });
});
