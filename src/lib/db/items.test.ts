import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    item: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import { getItemDetail } from "@/lib/db/items";

const USER_ID = "usr_1";
const ITEM_ID = "itm_1";

/** A row shaped like itemDetailSelect returns it. */
function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    title: "useAuth Hook",
    description: "Custom authentication hook",
    isFavorite: true,
    isPinned: false,
    createdAt: new Date("2026-01-15T00:00:00Z"),
    updatedAt: new Date("2026-02-01T00:00:00Z"),
    itemType: {
      id: "typ_1",
      name: "Snippet",
      icon: "Code",
      color: "#3b82f6",
    },
    tags: [{ name: "auth" }, { name: "react" }],
    content: "export function useAuth() {}",
    contentType: "TEXT",
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    language: "typescript",
    collections: [
      { collection: { id: "col_1", name: "React Patterns" } },
      { collection: { id: "col_2", name: "Interview Prep" } },
    ],
    ...overrides,
  };
}

describe("getItemDetail", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes the lookup to the calling user", async () => {
    prisma.item.findFirst.mockResolvedValue(itemRow());

    await getItemDetail(USER_ID, ITEM_ID);

    expect(prisma.item.findFirst).toHaveBeenCalledTimes(1);
    expect(prisma.item.findFirst.mock.calls[0][0].where).toEqual({
      id: ITEM_ID,
      userId: USER_ID,
    });
  });

  it("returns null for an item the caller does not own", async () => {
    // Another user's id and one that doesn't exist are the same query result:
    // the ownership filter is in the where clause, not a check afterwards
    prisma.item.findFirst.mockResolvedValue(null);

    await expect(
      getItemDetail(USER_ID, "itm_someone_else"),
    ).resolves.toBeNull();
    // No second, unscoped lookup to fall back on
    expect(prisma.item.findFirst).toHaveBeenCalledTimes(1);
  });

  it("flattens tags and unwraps collections from the join table", async () => {
    prisma.item.findFirst.mockResolvedValue(itemRow());

    const detail = await getItemDetail(USER_ID, ITEM_ID);

    expect(detail?.tags).toEqual(["auth", "react"]);
    expect(detail?.collections).toEqual([
      { id: "col_1", name: "React Patterns" },
      { id: "col_2", name: "Interview Prep" },
    ]);
    // The type comes off the itemType relation, renamed for the DTO
    expect(detail?.type).toEqual({
      id: "typ_1",
      name: "Snippet",
      icon: "Code",
      color: "#3b82f6",
    });
  });

  it("carries the detail-only fields the drawer needs", async () => {
    prisma.item.findFirst.mockResolvedValue(
      itemRow({
        content: null,
        contentType: "URL",
        url: "https://docs.docker.com/",
        language: null,
      }),
    );

    const detail = await getItemDetail(USER_ID, ITEM_ID);

    expect(detail).toMatchObject({
      content: null,
      contentType: "URL",
      url: "https://docs.docker.com/",
      language: null,
      updatedAt: new Date("2026-02-01T00:00:00Z"),
    });
  });

  it("returns an item with no collections as an empty list", async () => {
    prisma.item.findFirst.mockResolvedValue(
      itemRow({ collections: [], tags: [] }),
    );

    const detail = await getItemDetail(USER_ID, ITEM_ID);

    expect(detail?.collections).toEqual([]);
    expect(detail?.tags).toEqual([]);
  });
});
