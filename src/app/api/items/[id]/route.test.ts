import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getItemDetail } = vi.hoisted(() => ({
  auth: vi.fn(),
  getItemDetail: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/items", () => ({ getItemDetail }));

import { GET } from "@/app/api/items/[id]/route";

const USER_ID = "usr_1";
const ITEM_ID = "itm_1";

function request(id = ITEM_ID) {
  return [
    new Request(`http://localhost/api/items/${id}`),
    { params: Promise.resolve({ id }) },
  ] as const;
}

describe("GET /api/items/[id]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("401s without a session and never reaches the database", async () => {
    // This route sits outside the proxy matcher, which only covers the pages.
    // Its own auth check is the only thing standing in front of the query.
    auth.mockResolvedValue(null);

    const response = await GET(...request());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Not signed in",
    });
    expect(getItemDetail).not.toHaveBeenCalled();
  });

  it("401s on a session with no user id", async () => {
    auth.mockResolvedValue({ user: { email: "dev@devstash.io" } });

    const response = await GET(...request());

    expect(response.status).toBe(401);
    expect(getItemDetail).not.toHaveBeenCalled();
  });

  it("looks the item up as the session user, not as anyone the caller names", async () => {
    auth.mockResolvedValue({ user: { id: USER_ID } });
    getItemDetail.mockResolvedValue({ id: ITEM_ID, title: "useAuth Hook" });

    const response = await GET(...request());

    expect(getItemDetail).toHaveBeenCalledWith(USER_ID, ITEM_ID);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { id: ITEM_ID, title: "useAuth Hook" },
    });
  });

  it("404s when the query finds nothing for this user", async () => {
    auth.mockResolvedValue({ user: { id: USER_ID } });
    getItemDetail.mockResolvedValue(null);

    const response = await GET(...request("itm_someone_else"));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Item not found",
    });
  });
});
