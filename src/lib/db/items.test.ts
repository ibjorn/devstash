import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    item: { findFirst: vi.fn(), update: vi.fn(), delete: vi.fn() },
    tag: { deleteMany: vi.fn() },
  },
}));

// Runs an interactive transaction's callback against the same mocks, so the
// writes inside it can be asserted on as if they'd been made directly
function passThroughTransactions() {
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) =>
    fn(prisma),
  );
}

vi.mock("@/lib/prisma", () => ({ prisma }));

import { deleteItem, getItemDetail, updateItem } from "@/lib/db/items";

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

describe("updateItem", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    passThroughTransactions();
  });

  const data = {
    title: "Updated title",
    description: "Updated description",
    content: "export function useAuth() {}",
    url: null,
    language: "typescript",
    tags: ["auth", "react"],
  };

  it("puts the ownership filter in the update's own where clause", async () => {
    prisma.item.update.mockResolvedValue(itemRow());

    await updateItem(USER_ID, ITEM_ID, data);

    // Not fetched then checked — a row belonging to someone else matches
    // nothing and Prisma raises P2025, exactly as for an id that never existed
    expect(prisma.item.update).toHaveBeenCalledTimes(1);
    expect(prisma.item.update.mock.calls[0][0].where).toEqual({
      id: ITEM_ID,
      userId: USER_ID,
    });
  });

  it("replaces the whole tag set rather than adding to it", async () => {
    prisma.item.update.mockResolvedValue(itemRow());

    await updateItem(USER_ID, ITEM_ID, data);

    const tagWrite = prisma.item.update.mock.calls[0][0].data.tags;
    expect(tagWrite.set).toEqual([]);
    expect(tagWrite.connectOrCreate).toHaveLength(2);
  });

  it("keys tags on the calling user, so a name another user holds is a different row", async () => {
    prisma.item.update.mockResolvedValue(itemRow());

    await updateItem(USER_ID, ITEM_ID, data);

    const tagWrite = prisma.item.update.mock.calls[0][0].data.tags;
    expect(tagWrite.connectOrCreate[0]).toEqual({
      where: { userId_name: { userId: USER_ID, name: "auth" } },
      create: { name: "auth", userId: USER_ID },
    });
  });

  it("sweeps the user's now-unused tags in the same transaction", async () => {
    prisma.item.update.mockResolvedValue(itemRow());

    await updateItem(USER_ID, ITEM_ID, data);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.tag.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, items: { none: {} } },
    });
    // After the write that orphans them, not before
    expect(prisma.tag.deleteMany.mock.invocationCallOrder[0]).toBeGreaterThan(
      prisma.item.update.mock.invocationCallOrder[0],
    );
  });

  it("clears every tag when given an empty list", async () => {
    prisma.item.update.mockResolvedValue(itemRow({ tags: [] }));

    const updated = await updateItem(USER_ID, ITEM_ID, { ...data, tags: [] });

    const tagWrite = prisma.item.update.mock.calls[0][0].data.tags;
    expect(tagWrite.set).toEqual([]);
    expect(tagWrite.connectOrCreate).toEqual([]);
    expect(updated.tags).toEqual([]);
  });

  it("returns the saved item in full so the drawer can repaint without refetching", async () => {
    prisma.item.update.mockResolvedValue(
      itemRow({ title: "Updated title", tags: [{ name: "auth" }] }),
    );

    const updated = await updateItem(USER_ID, ITEM_ID, data);

    expect(updated.title).toBe("Updated title");
    expect(updated.tags).toEqual(["auth"]);
    expect(updated.collections).toEqual([
      { id: "col_1", name: "React Patterns" },
      { id: "col_2", name: "Interview Prep" },
    ]);
  });

  it("writes only the item's own columns — never the type or the collections", async () => {
    prisma.item.update.mockResolvedValue(itemRow());

    await updateItem(USER_ID, ITEM_ID, data);

    const written = prisma.item.update.mock.calls[0][0].data;
    expect(Object.keys(written).sort()).toEqual([
      "content",
      "description",
      "language",
      "tags",
      "title",
      "url",
    ]);
  });
});

describe("deleteItem", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    passThroughTransactions();
  });

  it("puts the ownership filter in the delete's own where clause", async () => {
    prisma.item.delete.mockResolvedValue({ id: ITEM_ID });

    await deleteItem(USER_ID, ITEM_ID);

    expect(prisma.item.delete).toHaveBeenCalledTimes(1);
    expect(prisma.item.delete.mock.calls[0][0].where).toEqual({
      id: ITEM_ID,
      userId: USER_ID,
    });
  });

  it("sweeps the user's now-unused tags after the delete", async () => {
    prisma.item.delete.mockResolvedValue({ id: ITEM_ID });

    await deleteItem(USER_ID, ITEM_ID);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.tag.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, items: { none: {} } },
    });
    expect(prisma.tag.deleteMany.mock.invocationCallOrder[0]).toBeGreaterThan(
      prisma.item.delete.mock.invocationCallOrder[0],
    );
  });

  it("sweeps nothing when the item isn't the caller's", async () => {
    prisma.item.delete.mockRejectedValue(
      Object.assign(new Error("not found"), { code: "P2025" }),
    );

    await expect(deleteItem(USER_ID, ITEM_ID)).rejects.toThrow();
    expect(prisma.tag.deleteMany).not.toHaveBeenCalled();
  });

  it("lets P2025 propagate so the caller can report a missing item", async () => {
    const notFound = Object.assign(new Error("not found"), { code: "P2025" });
    prisma.item.delete.mockRejectedValue(notFound);

    await expect(deleteItem(USER_ID, ITEM_ID)).rejects.toBe(notFound);
  });
});
