import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import { getPlanUsage } from "@/lib/db/entitlements";

describe("getPlanUsage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("flattens the counts and passes the billing fields through", async () => {
    const periodEnd = new Date("2026-11-16T00:00:00.000Z");
    prisma.user.findUnique.mockResolvedValue({
      isPro: true,
      subscriptionStatus: "non-renewing",
      currentPeriodEnd: periodEnd,
      _count: { items: 42, collections: 2 },
    });

    await expect(getPlanUsage("usr_1")).resolves.toEqual({
      isPro: true,
      subscriptionStatus: "non-renewing",
      currentPeriodEnd: periodEnd,
      items: 42,
      collections: 2,
    });
  });

  it("reads the session user in one select query", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await getPlanUsage("usr_1");

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    const args = prisma.user.findUnique.mock.calls[0][0];
    expect(args.where).toEqual({ id: "usr_1" });
    expect(args.select._count).toEqual({
      select: { items: true, collections: true },
    });
    expect(args).not.toHaveProperty("include");
  });

  it("returns null for a stale session", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(getPlanUsage("usr_gone")).resolves.toBeNull();
  });
});
