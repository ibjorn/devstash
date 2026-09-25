import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, deleteItemQuery, getItemDetail, updateItemQuery } = vi.hoisted(
  () => ({
    auth: vi.fn(),
    deleteItemQuery: vi.fn(),
    getItemDetail: vi.fn(),
    updateItemQuery: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/items", () => ({
  deleteItem: deleteItemQuery,
  getItemDetail,
  updateItem: updateItemQuery,
}));

import { deleteItem, updateItem } from "@/actions/items";
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
    deleteItemQuery.mockResolvedValue(undefined);

    await expect(deleteItem(ITEM_ID)).resolves.toEqual({ success: true });
    expect(deleteItemQuery).toHaveBeenCalledWith(USER_ID, ITEM_ID);
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
