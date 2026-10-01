import { describe, expect, it } from "vitest";

import {
  DEFAULT_EDITOR_PREFERENCES,
  editorLineHeight,
  editorPreferencesSchema,
  parseEditorPreferences,
} from "@/lib/editor-preferences";

const custom = {
  fontSize: 16,
  tabSize: 4,
  wordWrap: false,
  minimap: true,
  theme: "monokai",
};

describe("editorPreferencesSchema", () => {
  it("accepts a complete set of listed values", () => {
    expect(editorPreferencesSchema.parse(custom)).toEqual(custom);
  });

  it("drops keys it doesn't know", () => {
    const parsed = editorPreferencesSchema.parse({ ...custom, userId: "x" });
    expect(parsed).not.toHaveProperty("userId");
  });

  it.each([
    ["an unlisted font size", { fontSize: 15 }],
    ["a font size sent as a string", { fontSize: "16" }],
    ["an unlisted tab size", { tabSize: 3 }],
    ["an unknown theme", { theme: "solarized" }],
    ["a non-boolean toggle", { minimap: "true" }],
  ])("refuses %s", (_, change) => {
    expect(
      editorPreferencesSchema.safeParse({ ...custom, ...change }).success,
    ).toBe(false);
  });

  it("refuses a partial set", () => {
    expect(editorPreferencesSchema.safeParse({ fontSize: 14 }).success).toBe(
      false,
    );
  });
});

describe("parseEditorPreferences", () => {
  it.each([null, undefined, "garbage", 42, []])(
    "gives the defaults for %j",
    (stored) => {
      expect(parseEditorPreferences(stored)).toEqual(
        DEFAULT_EDITOR_PREFERENCES,
      );
    },
  );

  it("keeps a valid stored set", () => {
    expect(parseEditorPreferences(custom)).toEqual(custom);
  });

  it("replaces only the fields that are missing or invalid", () => {
    expect(
      parseEditorPreferences({ fontSize: 16, tabSize: 3, theme: "nope" }),
    ).toEqual({ ...DEFAULT_EDITOR_PREFERENCES, fontSize: 16 });
  });

  it.each([
    ["fontSize", 15],
    ["tabSize", "4"],
    ["wordWrap", "yes"],
    ["minimap", 1],
    ["theme", "solarized"],
  ])("resets a bad %s without discarding the rest", (key, bad) => {
    expect(parseEditorPreferences({ ...custom, [key]: bad })).toEqual({
      ...custom,
      [key]:
        DEFAULT_EDITOR_PREFERENCES[
          key as keyof typeof DEFAULT_EDITOR_PREFERENCES
        ],
    });
  });

  it("drops stray keys from the stored JSON", () => {
    expect(parseEditorPreferences({ ...custom, extra: 1 })).toEqual(custom);
  });
});

describe("editorLineHeight", () => {
  it("keeps the original 20px at the default 12px", () => {
    expect(editorLineHeight(12)).toBe(20);
  });

  it("grows with the font size", () => {
    expect(editorLineHeight(18)).toBe(30);
  });
});
