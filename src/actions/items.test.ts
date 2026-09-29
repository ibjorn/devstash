import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  auth,
  createItemQuery,
  deleteItemQuery,
  getCreatableItemType,
  getItemDetail,
  isFileKeyInUse,
  updateItemQuery,
  deleteObject,
  getObjectSize,
} = vi.hoisted(() => ({
  auth: vi.fn(),
  createItemQuery: vi.fn(),
  deleteItemQuery: vi.fn(),
  getCreatableItemType: vi.fn(),
  getItemDetail: vi.fn(),
  isFileKeyInUse: vi.fn(),
  updateItemQuery: vi.fn(),
  deleteObject: vi.fn(),
  getObjectSize: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/items", () => ({
  createItem: createItemQuery,
  deleteItem: deleteItemQuery,
  getCreatableItemType,
  getItemDetail,
  isFileKeyInUse,
  updateItem: updateItemQuery,
}));
vi.mock("@/lib/r2", () => ({ deleteObject, getObjectSize }));

import { createItem, deleteItem, updateItem } from "@/actions/items";
import { Prisma } from "@/generated/prisma/client";

const USER_ID = "usr_1";
const ITEM_ID = "itm_1";

function detail(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    title: "useAuth Hook",
    description: null,
    isFavorite: false,
    isPinned: false,
    createdAt: new Date("2026-01-15T00:00:00Z"),
    updatedAt: new Date("2026-02-01T00:00:00Z"),
    type: { id: "typ_1", name: "Snippet", icon: "Code", color: "#3b82f6" },
    tags: [],
    content: "export function useAuth() {}",
    contentType: "TEXT",
    url: null,
    fileUrl: null,
    fileName: null,
    fileSize: null,
    language: "typescript",
    collections: [],
    ...overrides,
  };
}

const valid = {
  title: "Updated title",
  description: "A description",
  content: "export function useAuth() {}",
  language: "typescript",
  url: null,
  tags: ["react"],
};

function signedIn() {
  auth.mockResolvedValue({ user: { id: USER_ID } });
}

describe("updateItem", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("refuses a caller with no session and never touches the database", async () => {
    auth.mockResolvedValue(null);

    const result = await updateItem(ITEM_ID, valid);

    expect(result.success).toBe(false);
    expect(getItemDetail).not.toHaveBeenCalled();
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("refuses a session with no user id", async () => {
    auth.mockResolvedValue({ user: {} });

    await expect(updateItem(ITEM_ID, valid)).resolves.toMatchObject({
      success: false,
    });
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("runs as the session user, not as anything the caller supplied", async () => {
    signedIn();
    getItemDetail.mockResolvedValue(detail());
    updateItemQuery.mockResolvedValue(detail());

    await updateItem(ITEM_ID, { ...valid, userId: "usr_someone_else" });

    expect(getItemDetail).toHaveBeenCalledWith(USER_ID, ITEM_ID);
    expect(updateItemQuery.mock.calls[0][0]).toBe(USER_ID);
  });

  it("returns field errors for invalid input without writing", async () => {
    signedIn();

    const result = await updateItem(ITEM_ID, { ...valid, title: "" });

    expect(result.success).toBe(false);
    expect(result.fieldErrors?.title).toBe("Title is required");
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("reports an item the caller cannot see as gone, without writing", async () => {
    signedIn();
    // getItemDetail is user-scoped, so another user's item arrives as null
    getItemDetail.mockResolvedValue(null);

    const result = await updateItem(ITEM_ID, valid);

    expect(result).toEqual({
      success: false,
      error: "That item no longer exists.",
    });
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("rejects a URL written onto a text item", async () => {
    signedIn();
    getItemDetail.mockResolvedValue(detail());

    const result = await updateItem(ITEM_ID, {
      ...valid,
      url: "https://evil.example/",
    });

    expect(result.success).toBe(false);
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("rejects content and language written onto a link item", async () => {
    signedIn();
    getItemDetail.mockResolvedValue(
      detail({ contentType: "URL", content: null, language: null }),
    );

    await expect(
      updateItem(ITEM_ID, { ...valid, url: "https://example.com/" }),
    ).resolves.toMatchObject({ success: false });
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("rejects content written onto a file item", async () => {
    signedIn();
    getItemDetail.mockResolvedValue(
      detail({ contentType: "FILE", content: null, language: null }),
    );

    await expect(updateItem(ITEM_ID, valid)).resolves.toMatchObject({
      success: false,
    });
    expect(updateItemQuery).not.toHaveBeenCalled();
  });

  it("leaves columns the item's type doesn't use exactly as they were", async () => {
    signedIn();
    getItemDetail.mockResolvedValue(
      detail({
        contentType: "URL",
        content: "left over from before",
        language: "sql",
        url: "https://docs.docker.com/",
      }),
    );
    updateItemQuery.mockResolvedValue(detail());

    await updateItem(ITEM_ID, {
      ...valid,
      content: null,
      language: null,
      url: "https://example.com/",
    });

    // A link edit must not blank the columns its form never showed
    expect(updateItemQuery.mock.calls[0][2]).toMatchObject({
      content: "left over from before",
      language: "sql",
      url: "https://example.com/",
    });
  });

  it("returns the saved item on success", async () => {
    signedIn();
    getItemDetail.mockResolvedValue(detail());
    updateItemQuery.mockResolvedValue(detail({ title: "Updated title" }));

    const result = await updateItem(ITEM_ID, valid);

    expect(result.success).toBe(true);
    expect(result.data?.title).toBe("Updated title");
  });

  it("reports a row that vanished between the read and the write", async () => {
    signedIn();
    getItemDetail.mockResolvedValue(detail());
    updateItemQuery.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record to update not found", {
        code: "P2025",
        clientVersion: "7.8.0",
      }),
    );

    await expect(updateItem(ITEM_ID, valid)).resolves.toEqual({
      success: false,
      error: "That item no longer exists.",
    });
  });

  it("does not leak an unexpected failure to the caller", async () => {
    signedIn();
    getItemDetail.mockResolvedValue(detail());
    updateItemQuery.mockRejectedValue(new Error("connection reset by peer"));
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const result = await updateItem(ITEM_ID, valid);

    expect(result).toEqual({
      success: false,
      error: "Could not save your changes.",
    });
    consoleError.mockRestore();
  });
});

describe("deleteItem", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("refuses a caller with no session and never touches the database", async () => {
    auth.mockResolvedValue(null);

    const result = await deleteItem(ITEM_ID);

    expect(result.success).toBe(false);
    expect(deleteItemQuery).not.toHaveBeenCalled();
  });

  it("deletes as the session user, not anyone the caller could name", async () => {
    signedIn();
    deleteItemQuery.mockResolvedValue({ fileKey: null });

    await expect(deleteItem(ITEM_ID)).resolves.toEqual({ success: true });
    expect(deleteItemQuery).toHaveBeenCalledWith(USER_ID, ITEM_ID);
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("removes the item's R2 object once the row is gone", async () => {
    signedIn();
    deleteItemQuery.mockResolvedValue({ fileKey: "usr_1/abc/a.png" });

    await expect(deleteItem(ITEM_ID)).resolves.toEqual({ success: true });
    expect(deleteObject).toHaveBeenCalledWith("usr_1/abc/a.png");
    expect(deleteObject.mock.invocationCallOrder[0]).toBeGreaterThan(
      deleteItemQuery.mock.invocationCallOrder[0],
    );
  });

  it("still reports success when only the R2 cleanup fails", async () => {
    signedIn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    deleteItemQuery.mockResolvedValue({ fileKey: "usr_1/abc/a.png" });
    deleteObject.mockRejectedValue(new Error("R2 down"));

    await expect(deleteItem(ITEM_ID)).resolves.toEqual({ success: true });
  });

  it("rejects a missing or non-string id without querying", async () => {
    signedIn();

    for (const bad of ["", undefined, 42, { id: ITEM_ID }]) {
      const result = await deleteItem(bad as unknown as string);
      expect(result.success).toBe(false);
    }
    expect(deleteItemQuery).not.toHaveBeenCalled();
  });

  it("reports a missing or non-owned item as no longer existing", async () => {
    signedIn();
    deleteItemQuery.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Record to delete not found", {
        code: "P2025",
        clientVersion: "7.8.0",
      }),
    );

    await expect(deleteItem(ITEM_ID)).resolves.toEqual({
      success: false,
      error: "That item no longer exists.",
    });
    expect(deleteObject).not.toHaveBeenCalled();
  });

  it("returns a generic error for anything else", async () => {
    signedIn();
    vi.spyOn(console, "error").mockImplementation(() => {});
    deleteItemQuery.mockRejectedValue(new Error("connection reset"));

    await expect(deleteItem(ITEM_ID)).resolves.toEqual({
      success: false,
      error: "Could not delete this item.",
    });
  });
});

describe("createItem", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const snippetType = {
    id: "typ_snip",
    name: "Snippet",
    slug: "snippets",
    icon: "Code",
    color: "#3b82f6",
    contentType: "TEXT",
  };
  const linkType = {
    id: "typ_link",
    name: "Link",
    slug: "links",
    icon: "Link",
    color: "#10b981",
    contentType: "URL",
  };

  const snippet = {
    itemTypeId: "typ_snip",
    title: "useAuth Hook",
    description: "",
    content: "export function useAuth() {}",
    language: "typescript",
    url: null,
    tags: ["react", "React"],
  };

  const link = {
    itemTypeId: "typ_link",
    title: "Next.js docs",
    description: null,
    content: null,
    language: null,
    url: "https://nextjs.org/docs",
    tags: [],
  };

  it("refuses a caller with no session and never touches the database", async () => {
    auth.mockResolvedValue(null);

    const result = await createItem(snippet);

    expect(result.success).toBe(false);
    expect(getCreatableItemType).not.toHaveBeenCalled();
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("creates as the session user, never anyone the caller names", async () => {
    signedIn();
    getCreatableItemType.mockResolvedValue(snippetType);
    createItemQuery.mockResolvedValue(detail());

    const result = await createItem({ ...snippet, userId: "usr_other" });

    expect(result.success).toBe(true);
    expect(createItemQuery).toHaveBeenCalledWith(USER_ID, {
      itemTypeId: "typ_snip",
      contentType: "TEXT",
      title: "useAuth Hook",
      description: null,
      content: "export function useAuth() {}",
      language: "typescript",
      url: null,
      tags: ["react"],
      fileUrl: null,
      fileName: null,
      fileSize: null,
    });
  });

  it("takes the content type from the resolved type, not the request", async () => {
    signedIn();
    getCreatableItemType.mockResolvedValue(linkType);
    createItemQuery.mockResolvedValue(detail({ contentType: "URL" }));

    await createItem({ ...link, contentType: "FILE" });

    expect(createItemQuery.mock.calls[0][1].contentType).toBe("URL");
  });

  it("returns field errors for invalid input without resolving the type", async () => {
    signedIn();

    const result = await createItem({ ...snippet, title: "  " });

    expect(result.fieldErrors).toHaveProperty("title");
    expect(getCreatableItemType).not.toHaveBeenCalled();
  });

  it("refuses a type the dialog wouldn't offer", async () => {
    signedIn();
    getCreatableItemType.mockResolvedValue(null);

    const result = await createItem({ ...snippet, itemTypeId: "typ_file" });

    expect(result).toMatchObject({
      success: false,
      error: "That item type isn't available.",
    });
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("requires a URL for a link", async () => {
    signedIn();
    getCreatableItemType.mockResolvedValue(linkType);

    const result = await createItem({ ...link, url: "" });

    expect(result.fieldErrors).toEqual({ url: "URL is required" });
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("refuses content on a link and a URL on a text type", async () => {
    signedIn();
    getCreatableItemType.mockResolvedValue(linkType);
    await expect(createItem({ ...link, content: "hi" })).resolves.toMatchObject(
      { success: false, error: "This item type has no content field." },
    );

    getCreatableItemType.mockResolvedValue(snippetType);
    await expect(
      createItem({ ...snippet, url: "https://example.com" }),
    ).resolves.toMatchObject({
      success: false,
      error: "This item type has no URL field.",
    });
    expect(createItemQuery).not.toHaveBeenCalled();
  });

  it("reports a failed write generically", async () => {
    signedIn();
    getCreatableItemType.mockResolvedValue(snippetType);
    createItemQuery.mockRejectedValue(new Error("connection reset"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(createItem(snippet)).resolves.toEqual({
      success: false,
      error: "Could not create this item.",
    });
  });

  describe("File and Image items", () => {
    const imageType = {
      id: "typ_img",
      name: "Image",
      slug: "images",
      icon: "Image",
      color: "#ec4899",
      contentType: "FILE",
    };
    const KEY = `${USER_ID}/0f8fad5b-d9cb-469f-a165-70867728950e/diagram.png`;
    const image = {
      itemTypeId: "typ_img",
      title: "Architecture diagram",
      fileKey: KEY,
      tags: [],
    };

    it("stores the key with the size R2 reports, not anything the client sent", async () => {
      signedIn();
      getCreatableItemType.mockResolvedValue(imageType);
      isFileKeyInUse.mockResolvedValue(false);
      getObjectSize.mockResolvedValue(2048);
      createItemQuery.mockResolvedValue(detail({ contentType: "FILE" }));

      const result = await createItem({
        ...image,
        fileSize: 1,
        fileName: "x.exe",
      });

      expect(result.success).toBe(true);
      expect(createItemQuery.mock.calls[0][1]).toMatchObject({
        contentType: "FILE",
        fileUrl: KEY,
        fileName: "diagram.png",
        fileSize: 2048,
        content: null,
        url: null,
      });
    });

    it("requires an upload", async () => {
      signedIn();
      getCreatableItemType.mockResolvedValue(imageType);

      const result = await createItem({ ...image, fileKey: null });

      expect(result.fieldErrors).toEqual({ file: "Upload a file first" });
      expect(createItemQuery).not.toHaveBeenCalled();
    });

    it("refuses a key outside the caller's own prefix without asking R2", async () => {
      signedIn();
      getCreatableItemType.mockResolvedValue(imageType);

      for (const fileKey of [
        KEY.replace(USER_ID, "usr_other"),
        `${USER_ID}/../usr_other/0f8fad5b-d9cb-469f-a165-70867728950e/a.png`,
        `${USER_ID}/not-a-uuid/diagram.png`,
      ]) {
        const result = await createItem({ ...image, fileKey });
        expect(result.fieldErrors).toHaveProperty("file");
      }
      expect(getObjectSize).not.toHaveBeenCalled();
      expect(createItemQuery).not.toHaveBeenCalled();
    });

    it("refuses a key another item already points at", async () => {
      signedIn();
      getCreatableItemType.mockResolvedValue(imageType);
      isFileKeyInUse.mockResolvedValue(true);

      const result = await createItem(image);

      expect(result.fieldErrors).toHaveProperty("file");
      expect(createItemQuery).not.toHaveBeenCalled();
    });

    it("refuses an upload that never landed", async () => {
      signedIn();
      getCreatableItemType.mockResolvedValue(imageType);
      isFileKeyInUse.mockResolvedValue(false);
      getObjectSize.mockResolvedValue(null);

      const result = await createItem(image);

      expect(result.fieldErrors).toHaveProperty("file");
      expect(createItemQuery).not.toHaveBeenCalled();
    });

    it("deletes and refuses an object over the type's limit", async () => {
      signedIn();
      getCreatableItemType.mockResolvedValue(imageType);
      isFileKeyInUse.mockResolvedValue(false);
      getObjectSize.mockResolvedValue(5 * 1024 * 1024 + 1);

      const result = await createItem(image);

      expect(result.fieldErrors?.file).toMatch(/too large/);
      expect(deleteObject).toHaveBeenCalledWith(KEY);
      expect(createItemQuery).not.toHaveBeenCalled();
    });

    it("refuses a file key on a type that takes no upload", async () => {
      signedIn();
      getCreatableItemType.mockResolvedValue(snippetType);

      const result = await createItem({ ...snippet, fileKey: KEY });

      expect(result).toMatchObject({
        success: false,
        error: "This item type has no file field.",
      });
      expect(getObjectSize).not.toHaveBeenCalled();
      expect(createItemQuery).not.toHaveBeenCalled();
    });
  });
});
