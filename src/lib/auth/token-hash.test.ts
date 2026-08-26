import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { hashToken } from "@/lib/auth/token-hash";

describe("hashToken", () => {
  it("returns a 64-char hex SHA-256 digest", () => {
    const hash = hashToken("a-raw-token");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(
      createHash("sha256").update("a-raw-token").digest("hex"),
    );
  });

  it("is deterministic, so a lookup can be an indexed equality match", () => {
    expect(hashToken("same")).toBe(hashToken("same"));
  });

  it("never returns the raw token", () => {
    expect(hashToken("a-raw-token")).not.toContain("a-raw-token");
  });

  it("separates tokens differing by one character", () => {
    expect(hashToken("token-a")).not.toBe(hashToken("token-b"));
  });
});
