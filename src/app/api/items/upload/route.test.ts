import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getCreatableItemType, createUploadUrl, checkRateLimit } =
  vi.hoisted(() => ({
    auth: vi.fn(),
    getCreatableItemType: vi.fn(),
    createUploadUrl: vi.fn(),
    checkRateLimit: vi.fn(),
  }));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/item-types", () => ({ getCreatableItemType }));
vi.mock("@/lib/r2", () => ({ createUploadUrl }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit,
}));

import { POST } from "@/app/api/items/upload/route";

const USER_ID = "usr_1";
const imageType = { id: "typ_img", name: "Image", contentType: "FILE" };
const snippetType = { id: "typ_snip", name: "Snippet", contentType: "TEXT" };

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/items/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const valid = {
  itemTypeId: "typ_img",
  fileName: "diagram.png",
  fileSize: 2048,
  mimeType: "image/png",
};

describe("POST /api/items/upload", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.mockResolvedValue({ user: { id: USER_ID } });
    getCreatableItemType.mockResolvedValue(imageType);
    checkRateLimit.mockResolvedValue({ success: true, retryAfterSeconds: 0 });
    createUploadUrl.mockResolvedValue("https://r2.example/signed");
  });

  it("401s without a session and never signs anything", async () => {
    auth.mockResolvedValue(null);

    const response = await post(valid);

    expect(response.status).toBe(401);
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it("signs a URL for a key under the session user's prefix", async () => {
    const response = await post(valid);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.key).toMatch(
      new RegExp(`^${USER_ID}/[0-9a-f-]{36}/diagram\\.png$`),
    );
    expect(body.data).toMatchObject({
      uploadUrl: "https://r2.example/signed",
      contentType: "image/png",
    });
    // Size and type are signed into the URL, so these must be the validated ones
    expect(createUploadUrl).toHaveBeenCalledWith(
      body.data.key,
      "image/png",
      2048,
    );
    expect(checkRateLimit).toHaveBeenCalledWith("fileUpload", USER_ID);
  });

  it("chooses the Content-Type itself rather than taking the browser's", async () => {
    getCreatableItemType.mockResolvedValue({ ...imageType, name: "File" });

    const response = await post({
      ...valid,
      itemTypeId: "typ_file",
      fileName: "notes.md",
      mimeType: "",
    });

    expect(response.status).toBe(200);
    expect(createUploadUrl).toHaveBeenCalledWith(
      expect.any(String),
      "text/plain; charset=utf-8",
      2048,
    );
  });

  it("refuses a type that doesn't take uploads", async () => {
    getCreatableItemType.mockResolvedValue(snippetType);

    const response = await post(valid);

    expect(response.status).toBe(400);
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it("refuses an unknown type id", async () => {
    getCreatableItemType.mockResolvedValue(null);

    expect((await post(valid)).status).toBe(400);
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it("refuses an oversized or disallowed file before spending rate limit", async () => {
    for (const bad of [
      { ...valid, fileSize: 5 * 1024 * 1024 + 1 },
      { ...valid, fileName: "payload.html", mimeType: "text/html" },
    ]) {
      const response = await post(bad);
      expect(response.status).toBe(400);
    }
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it("400s on a malformed body", async () => {
    expect((await post("{not json")).status).toBe(400);
    expect((await post({ ...valid, fileSize: "big" })).status).toBe(400);
  });

  it("429s once the user's upload budget is spent", async () => {
    checkRateLimit.mockResolvedValue({
      success: false,
      retryAfterSeconds: 120,
    });

    const response = await post(valid);

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(createUploadUrl).not.toHaveBeenCalled();
  });

  it("reports a signing failure without leaking it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    createUploadUrl.mockRejectedValue(new Error("R2 is not configured"));

    const response = await post(valid);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Uploads are unavailable right now.",
    });
  });
});
