import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, setItemPinnedQuery } = vi.hoisted(() => ({
  auth: vi.fn(),
  setItemPinnedQuery: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/pins", () => ({ setItemPinned: setItemPinnedQuery }));

import { setItemPinned } from "@/actions/pins";

const USER_ID = "usr_1";
const GONE = "That item no longer exists.";

function signedIn() {
  auth.mockResolvedValue({ user: { id: USER_ID } });
}

describe("setItemPinned", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("refuses a signed-out caller without reaching the database", async () => {
    auth.mockResolvedValue(null);

    const result = await setItemPinned("item_1", true);

    expect(result).toEqual({
      success: false,
      error: expect.stringMatching(/signed in/),
    });
    expect(setItemPinnedQuery).not.toHaveBeenCalled();
  });

  it("writes the requested value as the session user", async () => {
    signedIn();
    setItemPinnedQuery.mockResolvedValue(true);

    await expect(setItemPinned("item_1", true)).resolves.toEqual({
      success: true,
    });
    expect(setItemPinnedQuery).toHaveBeenCalledWith(USER_ID, "item_1", true);

    await setItemPinned("item_1", false);
    expect(setItemPinnedQuery).toHaveBeenLastCalledWith(
      USER_ID,
      "item_1",
      false,
    );
  });

  it.each([undefined, null, 42, "", "x".repeat(65)])(
    "rejects the id %j without querying",
    async (id) => {
      signedIn();

      await expect(setItemPinned(id, true)).resolves.toEqual({
        success: false,
        error: GONE,
      });
      expect(setItemPinnedQuery).not.toHaveBeenCalled();
    },
  );

  it.each(["true", 1, null, undefined])(
    "rejects a non-boolean value %j without querying",
    async (value) => {
      signedIn();

      const result = await setItemPinned("item_1", value);

      expect(result.success).toBe(false);
      expect(setItemPinnedQuery).not.toHaveBeenCalled();
    },
  );

  it("treats an item that isn't the caller's as gone", async () => {
    signedIn();
    setItemPinnedQuery.mockResolvedValue(false);

    await expect(setItemPinned("someone_elses", true)).resolves.toEqual({
      success: false,
      error: GONE,
    });
  });

  it("returns a generic error when the write fails", async () => {
    signedIn();
    setItemPinnedQuery.mockRejectedValue(new Error("connection reset"));

    await expect(setItemPinned("item_1", true)).resolves.toEqual({
      success: false,
      error: "Could not update this item.",
    });
  });
});
