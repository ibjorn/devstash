import { describe, expect, it } from "vitest";

import { scoreSearchMatch } from "@/lib/search-score";

describe("scoreSearchMatch", () => {
  it("never matches on the row's id", () => {
    // The value is a cuid; a search for its characters must find nothing
    expect(
      scoreSearchMatch("item:cmabc123xyz", "cmabc123", ["Docker cleanup"]),
    ).toBe(0);
  });

  it("gives 0 for an empty search or no keywords", () => {
    expect(scoreSearchMatch("item:1", "   ", ["Docker cleanup"])).toBe(0);
    expect(scoreSearchMatch("item:1", "docker", [])).toBe(0);
    expect(scoreSearchMatch("item:1", "docker", undefined)).toBe(0);
  });

  it("matches the title fuzzily", () => {
    expect(
      scoreSearchMatch("item:1", "dckr", ["Docker cleanup"]),
    ).toBeGreaterThan(0);
  });

  it("matches secondary text such as tags or the content preview", () => {
    expect(
      scoreSearchMatch("item:1", "prune", [
        "Cleanup",
        "docker system prune -af",
      ]),
    ).toBeGreaterThan(0);
  });

  it("ranks a title match above the same match in secondary text only", () => {
    const inTitle = scoreSearchMatch("item:1", "docker", ["Docker cleanup"]);
    const inContent = scoreSearchMatch("item:2", "docker", [
      "Deploy notes",
      "run it in docker",
    ]);

    expect(inTitle).toBeGreaterThan(inContent);
    expect(inContent).toBeGreaterThan(0);
  });

  it("doesn't fuzzy-match long secondary text", () => {
    // t…e…s…t appear in order here but the word "test" doesn't — this is what
    // made "test" match almost every item
    expect(
      scoreSearchMatch("item:1", "test", [
        "Docker cleanup",
        "the quick setup starts every container",
      ]),
    ).toBe(0);
  });

  it("requires every word of a multi-word search in secondary text", () => {
    const keywords = ["Cleanup", "docker system prune -af"];

    expect(
      scoreSearchMatch("item:1", "docker prune", keywords),
    ).toBeGreaterThan(0);
    expect(scoreSearchMatch("item:1", "docker kubernetes", keywords)).toBe(0);
  });

  it("matches words split across the title and secondary text", () => {
    expect(
      scoreSearchMatch("item:1", "cleanup prune", [
        "Docker cleanup",
        "docker system prune -af",
      ]),
    ).toBeGreaterThan(0);
  });

  it("finds nothing for an unrelated search", () => {
    expect(scoreSearchMatch("item:1", "kubernetes", ["Docker cleanup"])).toBe(
      0,
    );
  });
});
