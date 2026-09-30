import { describe, expect, it } from "vitest";

import { DEFAULT_SIGNED_IN_PATH, safeRedirectPath } from "@/lib/auth-redirect";

describe("safeRedirectPath", () => {
  it("keeps a same-origin path", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/items/notes")).toBe("/items/notes");
    expect(safeRedirectPath("/dashboard?tab=recent")).toBe(
      "/dashboard?tab=recent",
    );
  });

  it("rejects protocol-relative URLs", () => {
    // "//evil.com" is a path to the browser's eye but an off-site redirect
    expect(safeRedirectPath("//evil.com")).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath("//evil.com/dashboard")).toBe(
      DEFAULT_SIGNED_IN_PATH,
    );
  });

  it("rejects paths a browser would resolve off-site", () => {
    // Browsers read "\" as "/" and strip tab/newline, so each of these is
    // "//evil.com" by the time it reaches the Location header
    expect(safeRedirectPath("/\\evil.com")).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath("/\\/evil.com")).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath("/\t/evil.com")).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath("/\n/evil.com")).toBe(DEFAULT_SIGNED_IN_PATH);
  });

  it("rejects paths that only become off-site once normalised", () => {
    // Each is the path "//evil.com" on this host as typed, but resolving the
    // dot segments leaves a protocol-relative "//evil.com"
    expect(safeRedirectPath("/..//evil.com")).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath("/.//evil.com")).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath("/dashboard/..//evil.com")).toBe(
      DEFAULT_SIGNED_IN_PATH,
    );
    expect(safeRedirectPath("/%2e%2e//evil.com")).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath("/.\\/evil.com")).toBe(DEFAULT_SIGNED_IN_PATH);
  });

  it("returns the normalised path", () => {
    expect(safeRedirectPath("/items\\notes")).toBe("/items/notes");
    expect(safeRedirectPath("/dashboard#recent")).toBe("/dashboard#recent");
  });

  it("rejects absolute URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath("http://localhost:3000/dashboard")).toBe(
      DEFAULT_SIGNED_IN_PATH,
    );
    expect(safeRedirectPath("javascript:alert(1)")).toBe(
      DEFAULT_SIGNED_IN_PATH,
    );
  });

  it("rejects anything that isn't a path-shaped string", () => {
    // FormData.get() returns null or a File when the field is missing or a
    // file input, so the guard has to cope with more than strings
    expect(safeRedirectPath(null)).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath(undefined)).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath("")).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath("dashboard")).toBe(DEFAULT_SIGNED_IN_PATH);
    expect(safeRedirectPath(42)).toBe(DEFAULT_SIGNED_IN_PATH);
  });
});
