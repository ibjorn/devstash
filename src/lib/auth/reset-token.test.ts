import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted so the vi.mock factory below (which is itself hoisted above the
// imports) can close over the same object the assertions read.
const { verificationToken } = vi.hoisted(() => ({
  verificationToken: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: { verificationToken } }));

import { hashToken } from "@/lib/auth/token-hash";
import {
  RESET_TOKEN_TTL_MS,
  consumePasswordResetToken,
  createPasswordResetToken,
  findOutstandingResetToken,
  lookupPasswordResetToken,
  resetIdentifier,
  resetTokenIssuedAt,
} from "@/lib/auth/reset-token";

const EMAIL = "dev@devstash.io";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("resetIdentifier", () => {
  it("namespaces the address so a reset token can't be mistaken for a verification one", () => {
    expect(resetIdentifier(EMAIL)).toBe("password-reset:dev@devstash.io");
  });
});

describe("resetTokenIssuedAt", () => {
  it("recovers the issue time from expires, since the model has no createdAt", () => {
    const issued = new Date("2026-08-26T10:00:00.000Z");
    const expires = new Date(issued.getTime() + RESET_TOKEN_TTL_MS);
    expect(resetTokenIssuedAt(expires)).toEqual(issued);
  });
});

describe("createPasswordResetToken", () => {
  it("returns the raw token but stores only its hash", async () => {
    const raw = await createPasswordResetToken(EMAIL);

    // 32 random bytes, base64url-encoded
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const data = verificationToken.create.mock.calls[0]?.[0]?.data;
    expect(data.token).toBe(hashToken(raw));
    expect(data.token).not.toBe(raw);
    expect(data.identifier).toBe(resetIdentifier(EMAIL));
  });

  it("expires the token an hour out — far shorter than a verification link", () => {
    expect(RESET_TOKEN_TTL_MS).toBe(60 * 60 * 1000);
  });

  it("sets expires to issue time plus the TTL", async () => {
    const before = Date.now();
    await createPasswordResetToken(EMAIL);
    const after = Date.now();

    const expires: Date =
      verificationToken.create.mock.calls[0]?.[0]?.data.expires;
    expect(expires.getTime()).toBeGreaterThanOrEqual(
      before + RESET_TOKEN_TTL_MS,
    );
    expect(expires.getTime()).toBeLessThanOrEqual(after + RESET_TOKEN_TTL_MS);
  });

  it("replaces any outstanding token for the address and sweeps expired rows", async () => {
    await createPasswordResetToken(EMAIL);

    const where = verificationToken.deleteMany.mock.calls[0]?.[0]?.where;
    expect(where.OR[0]).toEqual({ identifier: resetIdentifier(EMAIL) });
    expect(where.OR[1].expires.lt).toBeInstanceOf(Date);
  });

  it("issues a different token every time", async () => {
    const first = await createPasswordResetToken(EMAIL);
    const second = await createPasswordResetToken(EMAIL);
    expect(first).not.toBe(second);
  });
});

describe("lookupPasswordResetToken", () => {
  const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);
  const anHourAgo = () => new Date(Date.now() - 60 * 60 * 1000);

  it("looks the token up by its hash, never by the raw value", async () => {
    verificationToken.findUnique.mockResolvedValue(null);
    await lookupPasswordResetToken("raw-token");
    expect(verificationToken.findUnique).toHaveBeenCalledWith({
      where: { token: hashToken("raw-token") },
    });
  });

  it("resolves a live token to the address it was issued for", async () => {
    verificationToken.findUnique.mockResolvedValue({
      identifier: resetIdentifier(EMAIL),
      token: hashToken("raw-token"),
      expires: inAnHour(),
    });
    await expect(lookupPasswordResetToken("raw-token")).resolves.toEqual({
      status: "valid",
      email: EMAIL,
    });
  });

  it("reports an expired token separately, so the user can be pointed at a resend", async () => {
    verificationToken.findUnique.mockResolvedValue({
      identifier: resetIdentifier(EMAIL),
      token: hashToken("raw-token"),
      expires: anHourAgo(),
    });
    await expect(lookupPasswordResetToken("raw-token")).resolves.toEqual({
      status: "expired",
      email: EMAIL,
    });
  });

  it("refuses an email-verification token, which is stored under the bare address", async () => {
    // The crossing attack: without the prefix check, a 24h "confirm your
    // address" link would also work as "set a new password on this account"
    verificationToken.findUnique.mockResolvedValue({
      identifier: EMAIL,
      token: hashToken("raw-token"),
      expires: inAnHour(),
    });
    await expect(lookupPasswordResetToken("raw-token")).resolves.toEqual({
      status: "unknown",
    });
  });

  it("reports an unrecognised token as unknown", async () => {
    verificationToken.findUnique.mockResolvedValue(null);
    await expect(lookupPasswordResetToken("nonsense")).resolves.toEqual({
      status: "unknown",
    });
  });
});

describe("consumePasswordResetToken", () => {
  it("deletes by hash, and by deleteMany so a double submit doesn't throw", async () => {
    await consumePasswordResetToken("raw-token");
    expect(verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { token: hashToken("raw-token") },
    });
  });
});

describe("findOutstandingResetToken", () => {
  it("only considers live tokens under the namespaced identifier", async () => {
    verificationToken.findFirst.mockResolvedValue(null);
    await findOutstandingResetToken(EMAIL);

    const args = verificationToken.findFirst.mock.calls[0]?.[0];
    expect(args.where.identifier).toBe(resetIdentifier(EMAIL));
    expect(args.where.expires.gt).toBeInstanceOf(Date);
  });
});
