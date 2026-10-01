import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, setItemFavoriteQuery, setCollectionFavoriteQuery } = vi.hoisted(
  () => ({
    auth: vi.fn(),
    setItemFavoriteQuery: vi.fn(),
    setCollectionFavoriteQuery: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/favorites", () => ({
  setItemFavorite: setItemFavoriteQuery,
  setCollectionFavorite: setCollectionFavoriteQuery,
}));

import { setCollectionFavorite, setItemFavorite } from "@/actions/favorites";

const USER_ID = "usr_1";

function signedIn() {
  auth.mockResolvedValue({ user: { id: USER_ID } });
}

describe.each([
  {
    name: "setItemFavorite",
    action: setItemFavorite,
    query: setItemFavoriteQuery,
    gone: "That item no longer exists.",
  },
  {
    name: "setCollectionFavorite",
    action: setCollectionFavorite,
    query: setCollectionFavoriteQuery,
    gone: "That collection no longer exists.",
  },
])("$name", ({ action, query, gone }) => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("refuses a signed-out caller without reaching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await action("row_1", true);

    expect(result).toEqual({
      success: false,
      error: expect.stringMatching(/signed in/),
    });
    expect(query).not.toHaveBeenCalled();
  });

  it("writes the requested value as the session user", async () => {
    signedIn();
    query.mockResolvedValue(true);

    await expect(action("row_1", true)).resolves.toEqual({ success: true });
    expect(query).toHaveBeenCalledWith(USER_ID, "row_1", true);

    await action("row_1", false);
    expect(query).toHaveBeenLastCalledWith(USER_ID, "row_1", false);
  });

  it.each([undefined, null, 42, "", "x".repeat(65)])(
    "rejects the id %j without querying",
    async (id) => {
      signedIn();

      const result = await action(id, true);

      expect(result).toEqual({ success: false, error: gone });
      expect(query).not.toHaveBeenCalled();
    },
  );

  it.each(["true", 1, null, undefined])(
    "rejects a non-boolean value %j without querying",
    async (value) => {
      signedIn();

      const result = await action("row_1", value);

      expect(result.success).toBe(false);
      expect(query).not.toHaveBeenCalled();
    },
  );

  it("treats a row that isn't the caller's as gone", async () => {
    signedIn();
    query.mockResolvedValue(false);

    await expect(action("someone_elses", true)).resolves.toEqual({
      success: false,
      error: gone,
    });
  });

  it("returns a generic error when the write fails", async () => {
    signedIn();
    query.mockRejectedValue(new Error("connection reset"));

    const result = await action("row_1", true);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/^Could not update this/);
  });
});
