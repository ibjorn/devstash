import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/openai", () => ({ getOpenAI: vi.fn(), aiModel: vi.fn() }));

import { cleanOptimized } from "@/lib/ai/optimize";
import { AiNoResultError } from "@/lib/ai/errors";

describe("cleanOptimized", () => {
  it("hands back the original exactly when only whitespace differs", () => {
    const original = "Summarise {{text}}.\n";

    expect(
      cleanOptimized({ prompt: "Summarise {{text}}.", changes: ["x"] }, original),
    ).toEqual({ prompt: original, changes: [], unchanged: true });
  });

  it("flattens, de-bullets and de-duplicates change notes", () => {
    const result = cleanOptimized(
      {
        prompt: "Better prompt",
        changes: ["- Added a format\n", "Added a format", "  ", "• Cut filler"],
      },
      "prompt",
    );

    expect(result).toEqual({
      prompt: "Better prompt",
      changes: ["Added a format", "Cut filler"],
      unchanged: false,
    });
  });

  it("caps the list at 8 and each note at 200 chars", () => {
    const changes = Array.from({ length: 12 }, (_, i) => `Change ${i}`);
    changes[0] = "x".repeat(500);

    const result = cleanOptimized({ prompt: "Better", changes }, "prompt");

    expect(result.changes).toHaveLength(8);
    expect(result.changes[0]).toHaveLength(200);
    expect(result.changes[0].endsWith("…")).toBe(true);
  });

  it("throws for an empty rewrite", () => {
    expect(() =>
      cleanOptimized({ prompt: " \n", changes: [] }, "prompt"),
    ).toThrow(AiNoResultError);
  });
});
