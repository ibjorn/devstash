import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { isPrismaError } from "@/lib/prisma-errors";

function knownError(code: string) {
  return new Prisma.PrismaClientKnownRequestError("failed", {
    code,
    clientVersion: "test",
  });
}

describe("isPrismaError", () => {
  it("matches a known-request error with the same code", () => {
    expect(isPrismaError(knownError("P2025"), "P2025")).toBe(true);
  });

  it("rejects a known-request error with a different code", () => {
    expect(isPrismaError(knownError("P2002"), "P2025")).toBe(false);
  });

  it("rejects a plain error that merely carries the code", () => {
    const lookalike = Object.assign(new Error("not found"), { code: "P2025" });
    expect(isPrismaError(lookalike, "P2025")).toBe(false);
  });

  it("rejects non-errors", () => {
    expect(isPrismaError(null, "P2025")).toBe(false);
    expect(isPrismaError("P2025", "P2025")).toBe(false);
  });
});
