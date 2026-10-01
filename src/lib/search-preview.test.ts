import { describe, expect, it } from "vitest";

import { SEARCH_PREVIEW_LENGTH, toSearchPreview } from "@/lib/search-preview";

describe("toSearchPreview", () => {
  it("gives null for missing or blank text", () => {
    expect(toSearchPreview(null)).toBeNull();
    expect(toSearchPreview("")).toBeNull();
    expect(toSearchPreview("  \n\t ")).toBeNull();
  });

  it("collapses whitespace onto one line", () => {
    expect(toSearchPreview("  docker system\n\n  prune -af  ")).toBe(
      "docker system prune -af",
    );
  });

  it("leaves short text untouched", () => {
    expect(toSearchPreview("hello", 10)).toBe("hello");
  });

  it("cuts long text and marks it", () => {
    const preview = toSearchPreview("a".repeat(500));

    expect(preview).toBe(`${"a".repeat(SEARCH_PREVIEW_LENGTH)}…`);
  });

  it("marks text whose whitespace collapsed it under the limit", () => {
    // 40 chars of content separated by long runs of whitespace — the scanned
    // head collapses to under the limit but the source carried on past it
    const text = `${"word ".repeat(2)}${" ".repeat(100)}${"tail ".repeat(20)}`;

    expect(toSearchPreview(text, 10)).toMatch(/…$/);
  });

  it("never splits a surrogate pair", () => {
    const preview = toSearchPreview("😀".repeat(20), 5);

    expect(preview).toBe(`${"😀".repeat(5)}…`);
  });

  it("scans only a bounded head of very long content", () => {
    const preview = toSearchPreview(`start${"x".repeat(100_000)}`, 10);

    expect(preview).toBe("startxxxxx…");
  });
});
