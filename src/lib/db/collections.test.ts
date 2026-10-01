import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    collection: {
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    itemType: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import {
  createCollection,
  deleteCollection,
  getAllCollections,
  getCollectionHeader,
  getSearchableCollections,
  updateCollection,
} from "@/lib/db/collections";

const USER_ID = "usr_1";

describe("createCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("creates the row owned by the given user", async () => {
    prisma.collection.create.mockResolvedValue({
      id: "col_1",
      name: "React Patterns",
      description: null,
      isFavorite: false,
    });

    await createCollection(USER_ID, {
      name: "React Patterns",
      description: null,
    });

    expect(prisma.collection.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: USER_ID, name: "React Patterns", description: null },
      }),
    );
  });

  it("returns an empty summary for the new collection", async () => {
    prisma.collection.create.mockResolvedValue({
      id: "col_1",
      name: "React Patterns",
      description: "Hooks",
      isFavorite: false,
    });

    await expect(
      createCollection(USER_ID, {
        name: "React Patterns",
        description: "Hooks",
      }),
    ).resolves.toEqual({
      id: "col_1",
      name: "React Patterns",
      description: "Hooks",
      isFavorite: false,
      itemCount: 0,
      types: [],
    });
  });
});

describe("getCollectionHeader", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("puts ownership in the where clause", async () => {
    prisma.collection.findFirst.mockResolvedValue(null);

    await getCollectionHeader(USER_ID, "col_1");

    expect(prisma.collection.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "col_1", userId: USER_ID } }),
    );
  });

  it("returns null for a collection the user doesn't own", async () => {
    prisma.collection.findFirst.mockResolvedValue(null);

    await expect(getCollectionHeader(USER_ID, "col_other")).resolves.toBeNull();
    expect(prisma.collection.findFirst).toHaveBeenCalledTimes(1);
  });
});

describe("getAllCollections", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("lists only the user's collections, without a limit", async () => {
    prisma.collection.findMany.mockResolvedValue([]);

    await getAllCollections(USER_ID);

    const [args] = prisma.collection.findMany.mock.calls[0];
    expect(args.where).toEqual({ userId: USER_ID });
    expect(args.take).toBeUndefined();
  });

  it("summarises item counts and orders types by usage", async () => {
    const snippet = {
      id: "typ_s",
      name: "Snippet",
      icon: "Code",
      color: "#3b82f6",
    };
    const note = {
      id: "typ_n",
      name: "Note",
      icon: "StickyNote",
      color: "#fde047",
    };
    prisma.collection.findMany.mockResolvedValue([
      {
        id: "col_1",
        name: "React Patterns",
        description: null,
        isFavorite: false,
        defaultTypeId: null,
        items: [
          { item: { itemType: note } },
          { item: { itemType: snippet } },
          { item: { itemType: snippet } },
        ],
      },
    ]);

    const [summary] = await getAllCollections(USER_ID);

    expect(summary.itemCount).toBe(3);
    expect(summary.types.map((type) => [type.id, type.count])).toEqual([
      ["typ_s", 2],
      ["typ_n", 1],
    ]);
  });
});

describe("updateCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes the update to the owner and writes only name and description", async () => {
    const header = {
      id: "col_1",
      name: "Renamed",
      description: null,
      isFavorite: false,
    };
    prisma.collection.update.mockResolvedValue(header);

    await expect(
      updateCollection(USER_ID, "col_1", {
        name: "Renamed",
        description: null,
      }),
    ).resolves.toEqual(header);
    expect(prisma.collection.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "col_1", userId: USER_ID },
        data: { name: "Renamed", description: null },
      }),
    );
  });
});

describe("deleteCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scopes the delete to the owner", async () => {
    prisma.collection.delete.mockResolvedValue({ id: "col_1" });

    await deleteCollection(USER_ID, "col_1");

    expect(prisma.collection.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "col_1", userId: USER_ID } }),
    );
  });
});

describe("getSearchableCollections", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("is scoped to the user and unbounded", async () => {
    prisma.collection.findMany.mockResolvedValue([]);

    await getSearchableCollections(USER_ID);

    const [args] = prisma.collection.findMany.mock.calls[0];
    expect(args.where).toEqual({ userId: USER_ID });
    expect(args).not.toHaveProperty("take");
  });

  it("flattens the item count", async () => {
    prisma.collection.findMany.mockResolvedValue([
      {
        id: "col_1",
        name: "React Patterns",
        description: null,
        _count: { items: 4 },
      },
    ]);

    await expect(getSearchableCollections(USER_ID)).resolves.toEqual([
      { id: "col_1", name: "React Patterns", description: null, itemCount: 4 },
    ]);
  });
});
