import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/openai", () => ({ getOpenAI: vi.fn(), aiModel: vi.fn() }));

import { cleanSummary } from "@/lib/ai/summary";

describe("cleanSummary", () => {
  it("flattens line breaks and strips wrapping quotes", () => {
    expect(cleanSummary('  "Debounces a value.\n\nUseful for search."  ')).toBe(
      "Debounces a value. Useful for search.",
    );
  });

  it("leaves a summary within the description limit alone", () => {
    const text = "word ".repeat(199).trim();
    expect(cleanSummary(text)).toBe(text);
  });

  it("clamps an over-long summary to 1,000 chars at a word, with an ellipsis", () => {
    const result = cleanSummary("word ".repeat(400));

    expect(result.length).toBeLessThanOrEqual(1_000);
    expect(result).toMatch(/word…$/);
  });

  it("hard-cuts a single unbroken run", () => {
    const result = cleanSummary("x".repeat(2_000));

    expect(result).toHaveLength(1_000);
    expect(result.endsWith("…")).toBe(true);
  });
});
