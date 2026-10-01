import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  auth,
  createCollectionQuery,
  updateCollectionQuery,
  deleteCollectionQuery,
} = vi.hoisted(() => ({
  auth: vi.fn(),
  createCollectionQuery: vi.fn(),
  updateCollectionQuery: vi.fn(),
  deleteCollectionQuery: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/collections", () => ({
  createCollection: createCollectionQuery,
  updateCollection: updateCollectionQuery,
  deleteCollection: deleteCollectionQuery,
}));

import { Prisma } from "@/generated/prisma/client";
import {
  createCollection,
  deleteCollection,
  updateCollection,
} from "@/actions/collections";

const USER_ID = "usr_1";

const summary = {
  id: "col_1",
  name: "React Patterns",
  description: null,
  isFavorite: false,
  itemCount: 0,
  types: [],
};

function signedIn() {
  auth.mockResolvedValue({ user: { id: USER_ID } });
}

describe("createCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("refuses a signed-out caller without reaching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await createCollection({ name: "React Patterns" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/signed in/);
    expect(createCollectionQuery).not.toHaveBeenCalled();
  });

  it("creates the collection as the session user, ignoring any userId sent", async () => {
    signedIn();
    createCollectionQuery.mockResolvedValue(summary);

    const result = await createCollection({
      name: "  React Patterns ",
      description: "",
      userId: "usr_other",
    });

    expect(createCollectionQuery).toHaveBeenCalledWith(USER_ID, {
      name: "React Patterns",
      description: null,
    });
    expect(result).toEqual({ success: true, data: summary });
  });

  it("returns field errors for invalid input without querying", async () => {
    signedIn();

    const result = await createCollection({
      name: " ",
      description: "a".repeat(1001),
    });

    expect(result.success).toBe(false);
    expect(result.fieldErrors).toEqual({
      name: "Name is required",
      description: "Description must be at most 1000 characters",
    });
    expect(createCollectionQuery).not.toHaveBeenCalled();
  });

  it("reports a generic error when the write fails", async () => {
    signedIn();
    createCollectionQuery.mockRejectedValue(new Error("connection lost"));

    const result = await createCollection({ name: "React Patterns" });

    expect(result).toEqual({
      success: false,
      error: "Could not create this collection.",
    });
  });
});

function notFoundError() {
  return new Prisma.PrismaClientKnownRequestError("Record not found", {
    code: "P2025",
    clientVersion: "test",
  });
}

const header = {
  id: "col_1",
  name: "React Patterns",
  description: "Hooks",
  isFavorite: false,
};

describe("updateCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("refuses a signed-out caller without reaching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await updateCollection("col_1", { name: "X" });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/signed in/);
    expect(updateCollectionQuery).not.toHaveBeenCalled();
  });

  it("updates as the session user with the parsed values", async () => {
    signedIn();
    updateCollectionQuery.mockResolvedValue(header);

    const result = await updateCollection("col_1", {
      name: " React Patterns ",
      description: "Hooks",
      userId: "usr_other",
    });

    expect(updateCollectionQuery).toHaveBeenCalledWith(USER_ID, "col_1", {
      name: "React Patterns",
      description: "Hooks",
    });
    expect(result).toEqual({ success: true, data: header });
  });

  it("rejects a bad id without querying", async () => {
    signedIn();

    for (const id of [undefined, 42, "", "x".repeat(65)]) {
      const result = await updateCollection(id, { name: "X" });
      expect(result).toEqual({
        success: false,
        error: "That collection no longer exists.",
      });
    }
    expect(updateCollectionQuery).not.toHaveBeenCalled();
  });

  it("returns field errors for invalid input without querying", async () => {
    signedIn();

    const result = await updateCollection("col_1", { name: "" });

    expect(result.fieldErrors).toEqual({ name: "Name is required" });
    expect(updateCollectionQuery).not.toHaveBeenCalled();
  });

  it("reports a missing or foreign collection as gone", async () => {
    signedIn();
    updateCollectionQuery.mockRejectedValue(notFoundError());

    await expect(updateCollection("col_1", { name: "X" })).resolves.toEqual({
      success: false,
      error: "That collection no longer exists.",
    });
  });

  it("reports a generic error when the write fails", async () => {
    signedIn();
    updateCollectionQuery.mockRejectedValue(new Error("connection lost"));

    await expect(updateCollection("col_1", { name: "X" })).resolves.toEqual({
      success: false,
      error: "Could not save this collection.",
    });
  });
});

describe("deleteCollection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("refuses a signed-out caller without reaching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await deleteCollection("col_1");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/signed in/);
    expect(deleteCollectionQuery).not.toHaveBeenCalled();
  });

  it("deletes as the session user", async () => {
    signedIn();
    deleteCollectionQuery.mockResolvedValue(undefined);

    await expect(deleteCollection("col_1")).resolves.toEqual({
      success: true,
    });
    expect(deleteCollectionQuery).toHaveBeenCalledWith(USER_ID, "col_1");
  });

  it("rejects a bad id without querying", async () => {
    signedIn();

    const result = await deleteCollection(null);

    expect(result.success).toBe(false);
    expect(deleteCollectionQuery).not.toHaveBeenCalled();
  });

  it("reports a missing or foreign collection as gone", async () => {
    signedIn();
    deleteCollectionQuery.mockRejectedValue(notFoundError());

    await expect(deleteCollection("col_1")).resolves.toEqual({
      success: false,
      error: "That collection no longer exists.",
    });
  });

  it("reports a generic error when the delete fails", async () => {
    signedIn();
    deleteCollectionQuery.mockRejectedValue(new Error("connection lost"));

    await expect(deleteCollection("col_1")).resolves.toEqual({
      success: false,
      error: "Could not delete this collection.",
    });
  });
});
