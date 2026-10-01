import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: { $executeRaw: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import { setItemPinned } from "@/lib/db/pins";

const USER_ID = "usr_1";

// A tagged-template call arrives as (strings, ...values)
function lastSql() {
  const [strings, ...values] = prisma.$executeRaw.mock.calls.at(-1) as [
    TemplateStringsArray,
    ...unknown[],
  ];
  return { text: strings.join("?").replace(/\s+/g, " ").trim(), values };
}

describe("setItemPinned", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes the write to the owner, with every value parameterised", async () => {
    prisma.$executeRaw.mockResolvedValue(1);

    await setItemPinned(USER_ID, "item_1", true);

    const { text, values } = lastSql();
    expect(text).toBe(
      'UPDATE "Item" SET "isPinned" = ? WHERE "id" = ? AND "userId" = ?',
    );
    expect(values).toEqual([true, "item_1", USER_ID]);
  });

  it("never writes updatedAt — pinning isn't an edit", async () => {
    prisma.$executeRaw.mockResolvedValue(1);

    await setItemPinned(USER_ID, "item_1", false);

    expect(lastSql().text).not.toContain("updatedAt");
  });

  it("reports whether an item of the user's matched", async () => {
    prisma.$executeRaw.mockResolvedValue(1);
    await expect(setItemPinned(USER_ID, "item_1", true)).resolves.toBe(true);

    prisma.$executeRaw.mockResolvedValue(0);
    await expect(setItemPinned(USER_ID, "someone_elses", true)).resolves.toBe(
      false,
    );
  });
});
