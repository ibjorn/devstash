import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getSearchableItems, getSearchableCollections } = vi.hoisted(
  () => ({
    auth: vi.fn(),
    getSearchableItems: vi.fn(),
    getSearchableCollections: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/items", () => ({ getSearchableItems }));
vi.mock("@/lib/db/collections", () => ({ getSearchableCollections }));

import { GET } from "@/app/api/search/route";

const USER_ID = "usr_1";

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("401s without a session and never reaches the database", async () => {
    // Outside the proxy matcher, so this check is all that guards the queries
    auth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Not signed in",
    });
    expect(getSearchableItems).not.toHaveBeenCalled();
    expect(getSearchableCollections).not.toHaveBeenCalled();
  });

  it("401s on a session with no user id", async () => {
    auth.mockResolvedValue({ user: { email: "dev@devstash.io" } });

    const response = await GET();

    expect(response.status).toBe(401);
    expect(getSearchableItems).not.toHaveBeenCalled();
  });

  it("returns the session user's items and collections", async () => {
    auth.mockResolvedValue({ user: { id: USER_ID } });
    getSearchableItems.mockResolvedValue([{ id: "itm_1", title: "useAuth" }]);
    getSearchableCollections.mockResolvedValue([
      { id: "col_1", name: "React", description: null, itemCount: 1 },
    ]);

    const response = await GET();

    expect(getSearchableItems).toHaveBeenCalledWith(USER_ID);
    expect(getSearchableCollections).toHaveBeenCalledWith(USER_ID);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        items: [{ id: "itm_1", title: "useAuth" }],
        collections: [
          { id: "col_1", name: "React", description: null, itemCount: 1 },
        ],
      },
    });
  });
});
