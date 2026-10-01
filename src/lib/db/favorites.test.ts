import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: { $executeRaw: vi.fn() },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import { setCollectionFavorite, setItemFavorite } from "@/lib/db/favorites";

const USER_ID = "usr_1";

// A tagged-template call arrives as (strings, ...values)
function lastSql() {
  const [strings, ...values] = prisma.$executeRaw.mock.calls.at(-1) as [
    TemplateStringsArray,
    ...unknown[],
  ];
  return { text: strings.join("?").replace(/\s+/g, " ").trim(), values };
}

describe.each([
  { name: "setItemFavorite", fn: setItemFavorite, table: '"Item"' },
  {
    name: "setCollectionFavorite",
    fn: setCollectionFavorite,
    table: '"Collection"',
  },
])("$name", ({ fn, table }) => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes the write to the owner, with every value parameterised", async () => {
    prisma.$executeRaw.mockResolvedValue(1);

    await fn(USER_ID, "row_1", true);

    const { text, values } = lastSql();
    expect(text).toBe(
      `UPDATE ${table} SET "isFavorite" = ? WHERE "id" = ? AND "userId" = ?`,
    );
    expect(values).toEqual([true, "row_1", USER_ID]);
  });

  it("never writes updatedAt — favoriting isn't an edit", async () => {
    prisma.$executeRaw.mockResolvedValue(1);

    await fn(USER_ID, "row_1", false);

    expect(lastSql().text).not.toContain("updatedAt");
  });

  it("reports whether a row of the user's matched", async () => {
    prisma.$executeRaw.mockResolvedValue(1);
    await expect(fn(USER_ID, "row_1", true)).resolves.toBe(true);

    prisma.$executeRaw.mockResolvedValue(0);
    await expect(fn(USER_ID, "someone_elses", true)).resolves.toBe(false);
  });
});
