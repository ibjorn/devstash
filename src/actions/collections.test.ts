import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, createCollectionQuery } = vi.hoisted(() => ({
  auth: vi.fn(),
  createCollectionQuery: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/collections", () => ({
  createCollection: createCollectionQuery,
}));

import { createCollection } from "@/actions/collections";

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
