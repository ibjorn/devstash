import { beforeEach, describe, expect, it, vi } from "vitest";

const { prisma } = vi.hoisted(() => ({
  prisma: {
    itemType: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma }));

import {
  getCreatableItemType,
  getCreatableItemTypes,
} from "@/lib/db/item-types";

describe("getCreatableItemTypes", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("offers every system type, in sidebar order, with its content type", async () => {
    prisma.itemType.findMany.mockResolvedValue([
      { id: "t_link", name: "Link", icon: "Link", color: "#10b981" },
      { id: "t_img", name: "Image", icon: "Image", color: "#ec4899" },
      { id: "t_note", name: "Note", icon: "StickyNote", color: "#fde047" },
      { id: "t_file", name: "File", icon: "File", color: "#6b7280" },
      { id: "t_snip", name: "Snippet", icon: "Code", color: "#3b82f6" },
    ]);

    const types = await getCreatableItemTypes();

    expect(prisma.itemType.findMany.mock.calls[0][0].where).toEqual({
      isSystem: true,
    });
    expect(
      types.map((type) => [type.name, type.slug, type.contentType]),
    ).toEqual([
      ["Snippet", "snippets", "TEXT"],
      ["Note", "notes", "TEXT"],
      ["File", "files", "FILE"],
      ["Image", "images", "FILE"],
      ["Link", "links", "URL"],
    ]);
  });
});

describe("getCreatableItemType", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("resolves the id only among system types", async () => {
    prisma.itemType.findFirst.mockResolvedValue(null);

    await expect(getCreatableItemType("t_other")).resolves.toBeNull();
    expect(prisma.itemType.findFirst.mock.calls[0][0].where).toEqual({
      id: "t_other",
      isSystem: true,
    });
  });

  it("derives a Link's content type as URL", async () => {
    prisma.itemType.findFirst.mockResolvedValue({
      id: "t_link",
      name: "Link",
      icon: "Link",
      color: "#10b981",
    });

    await expect(getCreatableItemType("t_link")).resolves.toMatchObject({
      contentType: "URL",
      slug: "links",
    });
  });
});
