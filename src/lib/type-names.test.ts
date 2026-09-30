import { describe, expect, it } from "vitest";

import { pluralTypeName, singularFromSlug, typeSlug } from "@/lib/type-names";

describe("pluralTypeName", () => {
  it("adds a trailing s", () => {
    expect(pluralTypeName("Snippet")).toBe("Snippets");
  });
});

describe("typeSlug", () => {
  it("pluralizes and lowercases", () => {
    expect(typeSlug("Snippet")).toBe("snippets");
    expect(typeSlug("Link")).toBe("links");
  });
});

describe("singularFromSlug", () => {
  it("inverts typeSlug", () => {
    for (const name of [
      "Snippet",
      "Prompt",
      "Command",
      "Note",
      "File",
      "Image",
      "Link",
    ]) {
      expect(singularFromSlug(typeSlug(name))).toBe(name.toLowerCase());
    }
  });

  it("strips the s whatever case the URL used", () => {
    expect(singularFromSlug("SNIPPETS")).toBe("snippet");
    expect(singularFromSlug("SnIpPeTs")).toBe("snippet");
  });

  it("leaves an already-singular slug alone", () => {
    expect(singularFromSlug("snippet")).toBe("snippet");
  });
});
