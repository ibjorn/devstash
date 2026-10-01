import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    item: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    itemType: { findFirst: vi.fn() },
    tag: { deleteMany: vi.fn() },
    collection: { count: vi.fn() },
  },
}));

// Every id counts as the caller's unless a test says otherwise
function allCollectionsOwned() {
  prisma.collection.count.mockImplementation(
    ({ where }: { where: { id: { in: string[] } } }) =>
      Promise.resolve(where.id.in.length),
  );
}

// Runs an interactive transaction's callback against the same mocks, so the
// writes inside it can be asserted on as if they'd been made directly
function passThroughTransactions() {
  prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => unknown) =>
    fn(prisma),
  );
}

vi.mock("@/lib/prisma", () => ({ prisma }));

import {
  createItem,
  deleteItem,
  getFavoriteItems,
  getItemDetail,
  getItemFile,
  getItemsByTypeSlug,
  getItemsInCollection,
  getSearchableItems,
  isFileKeyInUse,
  UnknownCollectionError,
  updateItem,
} from "@/lib/db/items";

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

describe("getItemsInCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("fetches one page, scoped to the user as well as the collection", async () => {
    prisma.item.findMany.mockResolvedValue([]);
    prisma.item.count.mockResolvedValue(50);

    await getItemsInCollection(USER_ID, "col_1", 3);

    const where = {
      userId: USER_ID,
      collections: { some: { collectionId: "col_1" } },
    };
    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
        skip: 42,
        take: 21,
      }),
    );
    // The total counts the same rows the page is cut from
    expect(prisma.item.count).toHaveBeenCalledWith({ where });
  });

  it("defaults to the first page", async () => {
    prisma.item.findMany.mockResolvedValue([]);
    prisma.item.count.mockResolvedValue(0);

    await getItemsInCollection(USER_ID, "col_1");

    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 21 }),
    );
  });

  it("returns the page's summaries and the full total", async () => {
    prisma.item.findMany.mockResolvedValue([itemRow()]);
    prisma.item.count.mockResolvedValue(30);

    const { rows, total } = await getItemsInCollection(USER_ID, "col_1");

    expect(total).toBe(30);
    expect(rows[0]).toMatchObject({
      id: ITEM_ID,
      title: "useAuth Hook",
      type: { name: "Snippet" },
      tags: ["auth", "react"],
    });
  });
});

describe("getItemsByTypeSlug", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const snippetType = {
    id: "typ_1",
    name: "Snippet",
    icon: "Code",
    color: "#3b82f6",
  };

  it("pages the user's items of the resolved type", async () => {
    prisma.itemType.findFirst.mockResolvedValue(snippetType);
    prisma.item.findMany.mockResolvedValue([itemRow()]);
    prisma.item.count.mockResolvedValue(22);

    const listing = await getItemsByTypeSlug(USER_ID, "snippets", 2);

    const where = { userId: USER_ID, itemTypeId: "typ_1" };
    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where, skip: 21, take: 21 }),
    );
    expect(prisma.item.count).toHaveBeenCalledWith({ where });
    expect(listing.type).toEqual(snippetType);
    expect(listing.total).toBe(22);
    expect(listing.items).toHaveLength(1);
  });

  it("returns an empty listing for an unknown slug without querying items", async () => {
    prisma.itemType.findFirst.mockResolvedValue(null);

    await expect(getItemsByTypeSlug(USER_ID, "bananas", 2)).resolves.toEqual({
      type: null,
      items: [],
      total: 0,
    });
    expect(prisma.item.findMany).not.toHaveBeenCalled();
    expect(prisma.item.count).not.toHaveBeenCalled();
  });
});

describe("getSearchableItems", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("is scoped to the user, unbounded and newest first", async () => {
    prisma.item.findMany.mockResolvedValue([]);

    await getSearchableItems(USER_ID);

    const [args] = prisma.item.findMany.mock.calls[0];
    expect(args.where).toEqual({ userId: USER_ID });
    expect(args.orderBy).toEqual({ createdAt: "desc" });
    expect(args).not.toHaveProperty("take");
  });

  it("returns a short preview instead of the full content", async () => {
    const content = "x".repeat(5000);
    prisma.item.findMany.mockResolvedValue([itemRow({ content, url: null })]);

    const [item] = await getSearchableItems(USER_ID);

    expect(item).toMatchObject({ id: ITEM_ID, type: { name: "Snippet" } });
    expect(item.preview?.length).toBeLessThan(300);
    expect(item).not.toHaveProperty("content");
    expect(item).not.toHaveProperty("url");
  });

  it("falls back to the URL for a link with no content", async () => {
    prisma.item.findMany.mockResolvedValue([
      itemRow({ content: null, url: "https://nextjs.org/docs" }),
    ]);

    const [item] = await getSearchableItems(USER_ID);

    expect(item.preview).toBe("https://nextjs.org/docs");
  });

  it("never selects the private file key", async () => {
    prisma.item.findMany.mockResolvedValue([]);

    await getSearchableItems(USER_ID);

    const [args] = prisma.item.findMany.mock.calls[0];
    expect(args.select).not.toHaveProperty("fileUrl");
  });
});

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
    allCollectionsOwned();
  });

  const data = {
    title: "Updated title",
    description: "Updated description",
    content: "export function useAuth() {}",
    url: null,
    language: "typescript",
    tags: ["auth", "react"],
    collectionIds: ["col_1", "col_2"],
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

  it("writes only the item's own columns and links — never the type", async () => {
    prisma.item.update.mockResolvedValue(itemRow());

    await updateItem(USER_ID, ITEM_ID, data);

    const written = prisma.item.update.mock.calls[0][0].data;
    expect(Object.keys(written).sort()).toEqual([
      "collections",
      "content",
      "description",
      "language",
      "tags",
      "title",
      "url",
    ]);
  });

  it("checks every collection is the caller's own before writing", async () => {
    prisma.item.update.mockResolvedValue(itemRow());

    await updateItem(USER_ID, ITEM_ID, data);

    expect(prisma.collection.count).toHaveBeenCalledWith({
      where: { id: { in: ["col_1", "col_2"] }, userId: USER_ID },
    });
    expect(prisma.collection.count.mock.invocationCallOrder[0]).toBeLessThan(
      prisma.item.update.mock.invocationCallOrder[0],
    );
  });

  it("refuses a collection that isn't the caller's, writing nothing", async () => {
    // One of the two ids belongs to someone else, so only one counts
    prisma.collection.count.mockResolvedValue(1);

    await expect(updateItem(USER_ID, ITEM_ID, data)).rejects.toBeInstanceOf(
      UnknownCollectionError,
    );
    expect(prisma.item.update).not.toHaveBeenCalled();
  });

  it("syncs links so the ones that survive keep their addedAt", async () => {
    prisma.item.update.mockResolvedValue(itemRow());

    await updateItem(USER_ID, ITEM_ID, data);

    // Only links outside the new set are removed; existing ones are skipped
    // rather than recreated
    expect(prisma.item.update.mock.calls[0][0].data.collections).toEqual({
      deleteMany: { collectionId: { notIn: ["col_1", "col_2"] } },
      createMany: {
        data: [{ collectionId: "col_1" }, { collectionId: "col_2" }],
        skipDuplicates: true,
      },
    });
  });

  it("removes the item from every collection when given an empty list", async () => {
    prisma.item.update.mockResolvedValue(itemRow({ collections: [] }));

    await updateItem(USER_ID, ITEM_ID, { ...data, collectionIds: [] });

    // Nothing to check ownership of
    expect(prisma.collection.count).not.toHaveBeenCalled();
    expect(prisma.item.update.mock.calls[0][0].data.collections).toEqual({
      deleteMany: { collectionId: { notIn: [] } },
      createMany: { data: [], skipDuplicates: true },
    });
  });
});

describe("deleteItem", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    passThroughTransactions();
  });

  it("puts the ownership filter in the delete's own where clause", async () => {
    prisma.item.delete.mockResolvedValue({ fileUrl: null });

    await deleteItem(USER_ID, ITEM_ID);

    expect(prisma.item.delete).toHaveBeenCalledTimes(1);
    expect(prisma.item.delete.mock.calls[0][0].where).toEqual({
      id: ITEM_ID,
      userId: USER_ID,
    });
  });

  it("returns the deleted item's file key so its object can be removed", async () => {
    prisma.item.delete.mockResolvedValue({ fileUrl: "usr_1/abc/a.png" });

    await expect(deleteItem(USER_ID, ITEM_ID)).resolves.toEqual({
      fileKey: "usr_1/abc/a.png",
    });
  });

  it("sweeps the user's now-unused tags after the delete", async () => {
    prisma.item.delete.mockResolvedValue({ fileUrl: null });

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

describe("createItem", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    passThroughTransactions();
    allCollectionsOwned();
  });

  const data = {
    itemTypeId: "typ_1",
    contentType: "TEXT" as const,
    title: "useAuth Hook",
    description: null,
    content: "export function useAuth() {}",
    url: null,
    language: "typescript",
    tags: ["react", "auth"],
    collectionIds: [] as string[],
    fileUrl: null,
    fileName: null,
    fileSize: null,
  };

  it("links the item to the caller's chosen collections", async () => {
    prisma.item.create.mockResolvedValue(itemRow());

    await createItem(USER_ID, { ...data, collectionIds: ["col_1", "col_2"] });

    expect(prisma.collection.count).toHaveBeenCalledWith({
      where: { id: { in: ["col_1", "col_2"] }, userId: USER_ID },
    });
    expect(prisma.item.create.mock.calls[0][0].data.collections).toEqual({
      createMany: {
        data: [{ collectionId: "col_1" }, { collectionId: "col_2" }],
      },
    });
  });

  it("refuses a collection that isn't the caller's, creating nothing", async () => {
    prisma.collection.count.mockResolvedValue(0);

    await expect(
      createItem(USER_ID, { ...data, collectionIds: ["col_other"] }),
    ).rejects.toBeInstanceOf(UnknownCollectionError);
    expect(prisma.item.create).not.toHaveBeenCalled();
  });

  it("writes the file columns for an uploaded item", async () => {
    prisma.item.create.mockResolvedValue(itemRow());

    await createItem(USER_ID, {
      ...data,
      contentType: "FILE",
      content: null,
      language: null,
      fileUrl: "usr_1/abc/diagram.png",
      fileName: "diagram.png",
      fileSize: 2048,
    });

    expect(prisma.item.create.mock.calls[0][0].data).toMatchObject({
      contentType: "FILE",
      fileUrl: "usr_1/abc/diagram.png",
      fileName: "diagram.png",
      fileSize: 2048,
    });
  });

  it("creates the item as the given user with per-user tags", async () => {
    prisma.item.create.mockResolvedValue(itemRow());

    await createItem(USER_ID, data);

    const call = prisma.item.create.mock.calls[0][0];
    expect(call.data).toMatchObject({
      userId: USER_ID,
      itemTypeId: "typ_1",
      contentType: "TEXT",
      title: "useAuth Hook",
      language: "typescript",
    });
    expect(call.data.tags.connectOrCreate).toEqual([
      {
        where: { userId_name: { userId: USER_ID, name: "react" } },
        create: { name: "react", userId: USER_ID },
      },
      {
        where: { userId_name: { userId: USER_ID, name: "auth" } },
        create: { name: "auth", userId: USER_ID },
      },
    ]);
  });

  it("returns the created item in the drawer's shape", async () => {
    prisma.item.create.mockResolvedValue(itemRow());

    const created = await createItem(USER_ID, data);

    expect(created).toMatchObject({
      id: ITEM_ID,
      type: { name: "Snippet" },
      tags: ["auth", "react"],
      collections: [
        { id: "col_1", name: "React Patterns" },
        { id: "col_2", name: "Interview Prep" },
      ],
    });
  });
});

describe("getItemFile", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes the lookup to the user in the query itself", async () => {
    prisma.item.findFirst.mockResolvedValue({
      fileUrl: "usr_1/abc/a.pdf",
      fileName: "a.pdf",
    });

    await expect(getItemFile(USER_ID, ITEM_ID)).resolves.toEqual({
      key: "usr_1/abc/a.pdf",
      fileName: "a.pdf",
    });
    expect(prisma.item.findFirst.mock.calls[0][0].where).toEqual({
      id: ITEM_ID,
      userId: USER_ID,
    });
  });

  it("returns null for another user's item or one with no file", async () => {
    prisma.item.findFirst.mockResolvedValueOnce(null);
    await expect(getItemFile(USER_ID, ITEM_ID)).resolves.toBeNull();

    prisma.item.findFirst.mockResolvedValueOnce({
      fileUrl: null,
      fileName: null,
    });
    await expect(getItemFile(USER_ID, ITEM_ID)).resolves.toBeNull();
  });
});

describe("isFileKeyInUse", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("looks for the key among the user's own items", async () => {
    prisma.item.findFirst.mockResolvedValue({ id: ITEM_ID });

    await expect(isFileKeyInUse(USER_ID, "usr_1/abc/a.pdf")).resolves.toBe(
      true,
    );
    expect(prisma.item.findFirst.mock.calls[0][0].where).toEqual({
      userId: USER_ID,
      fileUrl: "usr_1/abc/a.pdf",
    });
  });
});

describe("getFavoriteItems", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns only the user's favorites, most recently updated first", async () => {
    prisma.item.findMany.mockResolvedValue([]);

    await getFavoriteItems(USER_ID);

    const [args] = prisma.item.findMany.mock.calls[0];
    expect(args.where).toEqual({ userId: USER_ID, isFavorite: true });
    expect(args.orderBy).toEqual([{ updatedAt: "desc" }, { id: "desc" }]);
    expect(args).not.toHaveProperty("take");
  });

  it("maps rows to summaries carrying updatedAt", async () => {
    prisma.item.findMany.mockResolvedValue([itemRow()]);

    const [item] = await getFavoriteItems(USER_ID);

    expect(item).toMatchObject({
      id: ITEM_ID,
      title: "useAuth Hook",
      type: { name: "Snippet" },
      tags: ["auth", "react"],
      updatedAt: new Date("2026-02-01T00:00:00Z"),
    });
    expect(item).not.toHaveProperty("content");
  });
});
