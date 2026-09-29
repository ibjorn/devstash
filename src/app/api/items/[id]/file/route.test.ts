import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getItemFile, getObjectStream } = vi.hoisted(() => ({
  auth: vi.fn(),
  getItemFile: vi.fn(),
  getObjectStream: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/items", () => ({ getItemFile }));
vi.mock("@/lib/r2", () => ({ getObjectStream }));

import { GET } from "@/app/api/items/[id]/file/route";

const USER_ID = "usr_1";
const ITEM_ID = "itm_1";

function get(query = "") {
  return GET(
    new Request(`http://localhost/api/items/${ITEM_ID}/file${query}`),
    {
      params: Promise.resolve({ id: ITEM_ID }),
    },
  );
}

function stream(text: string) {
  return new Blob([text]).stream();
}

describe("GET /api/items/[id]/file", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.mockResolvedValue({ user: { id: USER_ID } });
  });

  it("401s without a session and never reaches the database or R2", async () => {
    auth.mockResolvedValue(null);

    expect((await get()).status).toBe(401);
    expect(getItemFile).not.toHaveBeenCalled();
    expect(getObjectStream).not.toHaveBeenCalled();
  });

  it("looks the file up as the session user", async () => {
    getItemFile.mockResolvedValue(null);

    const response = await get();

    expect(response.status).toBe(404);
    expect(getItemFile).toHaveBeenCalledWith(USER_ID, ITEM_ID);
    expect(getObjectStream).not.toHaveBeenCalled();
  });

  it("streams an image inline with locked-down headers", async () => {
    getItemFile.mockResolvedValue({ key: "usr_1/x/a.png", fileName: "a.png" });
    getObjectStream.mockResolvedValue({ body: stream("png"), size: 3 });

    const response = await get();

    expect(response.status).toBe(200);
    expect(getObjectStream).toHaveBeenCalledWith("usr_1/x/a.png");
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toMatch(/^inline;/);
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Content-Security-Policy")).toMatch(
      /^sandbox;/,
    );
    expect(response.headers.get("Cache-Control")).toMatch(/^private/);
    expect(response.headers.get("Content-Length")).toBe("3");
    await expect(response.text()).resolves.toBe("png");
  });

  it("forces a download when asked", async () => {
    getItemFile.mockResolvedValue({ key: "usr_1/x/a.png", fileName: "a.png" });
    getObjectStream.mockResolvedValue({ body: stream("png"), size: 3 });

    const response = await get("?download=1");

    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment;/);
  });

  it("never serves an SVG inline", async () => {
    getItemFile.mockResolvedValue({ key: "usr_1/x/a.svg", fileName: "a.svg" });
    getObjectStream.mockResolvedValue({ body: stream("<svg/>"), size: 6 });

    const response = await get();

    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment;/);
    expect(response.headers.get("Content-Security-Policy")).toMatch(/sandbox/);
  });

  it("404s when the object is missing from the bucket", async () => {
    getItemFile.mockResolvedValue({ key: "usr_1/x/a.pdf", fileName: "a.pdf" });
    getObjectStream.mockResolvedValue(null);

    expect((await get()).status).toBe(404);
  });

  it("502s on a storage failure without leaking it", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getItemFile.mockResolvedValue({ key: "usr_1/x/a.pdf", fileName: "a.pdf" });
    getObjectStream.mockRejectedValue(new Error("socket hang up"));

    const response = await get();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "Could not load this file.",
    });
  });
});
