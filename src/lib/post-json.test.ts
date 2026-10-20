import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { UNREACHABLE_MESSAGE } from "./messages";
import { postJson } from "./post-json";

const fetchMock = vi.fn();

function respond(status: number, body: unknown) {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

describe("postJson", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs the body as JSON and returns the route's data", async () => {
    respond(200, { success: true, data: { message: "Sent" } });

    const result = await postJson("/api/x", { email: "a@b.co" }, "Failed");

    expect(result).toEqual({ ok: true, data: { message: "Sent" } });
    expect(fetchMock).toHaveBeenCalledWith("/api/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "a@b.co" }),
    });
  });

  it("returns the route's error on a failed response", async () => {
    respond(429, { success: false, error: "Slow down" });

    expect(await postJson("/api/x", {}, "Failed")).toEqual({
      ok: false,
      error: "Slow down",
    });
  });

  it("falls back when a failed response names no error", async () => {
    respond(500, { success: false });

    expect(await postJson("/api/x", {}, "Failed")).toEqual({
      ok: false,
      error: "Failed",
    });
  });

  it("reports the server unreachable when fetch throws", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    expect(await postJson("/api/x", {}, "Failed")).toEqual({
      ok: false,
      error: UNREACHABLE_MESSAGE,
    });
  });

  it("reports the server unreachable when the body isn't JSON", async () => {
    fetchMock.mockResolvedValue(new Response("<html>502</html>", { status: 502 }));

    expect(await postJson("/api/x", {}, "Failed")).toEqual({
      ok: false,
      error: UNREACHABLE_MESSAGE,
    });
  });
});
