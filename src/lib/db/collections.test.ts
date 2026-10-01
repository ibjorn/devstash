import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: { collection: { create: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import { createCollection } from "@/lib/db/collections";

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
