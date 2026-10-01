import { describe, expect, it } from "vitest";

import {
  pageCount,
  pageHref,
  pageLinks,
  pageRange,
  parsePageParam,
} from "@/lib/pagination";

describe("parsePageParam", () => {
  it("reads a positive integer", () => {
    expect(parsePageParam("1")).toBe(1);
    expect(parsePageParam("7")).toBe(7);
  });

  it.each([
    undefined,
    "",
    "0",
    "-2",
    "1.5",
    "2abc",
    " 3",
    "1e3",
    "0x10",
    "99999999999999999999",
    ["2", "3"],
  ])("treats %j as page 1", (raw) => {
    expect(parsePageParam(raw)).toBe(1);
  });
});

describe("pageCount", () => {
  it("rounds up to whole pages", () => {
    expect(pageCount(21, 21)).toBe(1);
    expect(pageCount(22, 21)).toBe(2);
    expect(pageCount(63, 21)).toBe(3);
  });

  it("gives an empty listing one page", () => {
    expect(pageCount(0, 21)).toBe(1);
  });
});

describe("pageRange", () => {
  it("maps a 1-based page to skip/take", () => {
    expect(pageRange(1, 21)).toEqual({ skip: 0, take: 21 });
    expect(pageRange(3, 21)).toEqual({ skip: 42, take: 21 });
  });
});

describe("pageHref", () => {
  it("leaves page 1 as the bare path", () => {
    expect(pageHref("/collections", 1)).toBe("/collections");
  });

  it("adds the page param after that", () => {
    expect(pageHref("/items/snippets", 4)).toBe("/items/snippets?page=4");
  });
});

describe("pageLinks", () => {
  it("lists a short range in full", () => {
    expect(pageLinks(1, 1)).toEqual([1]);
    expect(pageLinks(1, 2)).toEqual([1, 2]);
    expect(pageLinks(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses gaps either side of the current page", () => {
    expect(pageLinks(6, 12)).toEqual([1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
  });

  it("collapses only the far gap near either end", () => {
    expect(pageLinks(1, 12)).toEqual([1, 2, "ellipsis", 12]);
    expect(pageLinks(12, 12)).toEqual([1, "ellipsis", 11, 12]);
  });

  it("shows a single hidden page instead of an ellipsis", () => {
    expect(pageLinks(4, 12)).toEqual([1, 2, 3, 4, 5, "ellipsis", 12]);
    expect(pageLinks(9, 12)).toEqual([1, "ellipsis", 8, 9, 10, 11, 12]);
  });
});
