import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const { auth, getPlanUsage, checkRateLimit } = vi.hoisted(() => ({
  auth: vi.fn(),
  getPlanUsage: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/entitlements", () => ({ getPlanUsage }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit,
}));

import { guardAiRequest } from "@/lib/ai/guard";
import { DENIAL_MESSAGES } from "@/lib/entitlements";

const USER_ID = "usr_1";
const schema = z.object({ title: z.string().min(1, "Title is required") });
const freePlan = {
  isPro: false,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  items: 0,
  collections: 0,
};

function guard(body: unknown) {
  return guardAiRequest(
    new Request("http://localhost/api/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    schema,
  );
}

describe("guardAiRequest", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    auth.mockResolvedValue({ user: { id: USER_ID } });
    getPlanUsage.mockResolvedValue({ ...freePlan, isPro: true });
    checkRateLimit.mockResolvedValue({ success: true, retryAfterSeconds: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("401s without a session, before reading the body or the plan", async () => {
    auth.mockResolvedValue(null);

    const { response } = await guard({ title: "x" });

    expect(response?.status).toBe(401);
    expect(getPlanUsage).not.toHaveBeenCalled();
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("400s a malformed body with the schema's message, spending no budget", async () => {
    const { response } = await guard({ title: "" });

    expect(response?.status).toBe(400);
    expect(await response?.json()).toEqual({
      success: false,
      error: "Title is required",
    });
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("400s a body that isn't JSON", async () => {
    const { response } = await guard("{not json");

    expect(response?.status).toBe(400);
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("403s a Free user with upgrade when billing is enforced, spending no budget", async () => {
    vi.stubEnv("BILLING_ENFORCED", "true");
    getPlanUsage.mockResolvedValue(freePlan);

    const { response } = await guard({ title: "x" });

    expect(response?.status).toBe(403);
    expect(await response?.json()).toEqual({
      success: false,
      error: DENIAL_MESSAGES.PRO_AI,
      upgrade: true,
    });
    expect(checkRateLimit).not.toHaveBeenCalled();
  });

  it("lets the same Free user through when billing isn't enforced", async () => {
    getPlanUsage.mockResolvedValue(freePlan);

    const result = await guard({ title: "x" });

    expect(result.response).toBeUndefined();
    expect(result.data).toEqual({ title: "x" });
  });

  it("403s a stale session whose user row is gone", async () => {
    vi.stubEnv("BILLING_ENFORCED", "true");
    getPlanUsage.mockResolvedValue(null);

    const { response } = await guard({ title: "x" });

    expect(response?.status).toBe(403);
  });

  it("checks the shared ai bucket by user id, failing closed", async () => {
    await guard({ title: "x" });

    expect(checkRateLimit).toHaveBeenCalledWith("ai", USER_ID, {
      failClosed: true,
    });
  });

  it("429s with Retry-After when the user is over their limit", async () => {
    checkRateLimit.mockResolvedValue({ success: false, retryAfterSeconds: 120 });

    const { response } = await guard({ title: "x" });

    expect(response?.status).toBe(429);
    expect(response?.headers.get("Retry-After")).toBe("120");
  });

  it("503s, not 429s, when no limiter could run", async () => {
    checkRateLimit.mockResolvedValue({
      success: false,
      retryAfterSeconds: 60,
      unavailable: true,
    });

    const { response } = await guard({ title: "x" });

    expect(response?.status).toBe(503);
    expect(response?.headers.get("Retry-After")).toBeNull();
    expect(await response?.json()).toEqual({
      success: false,
      error: "AI features are temporarily unavailable.",
    });
  });

  it("hands back the user id and parsed data when every check passes", async () => {
    const result = await guard({ title: "x" });

    expect(result).toEqual({ userId: USER_ID, data: { title: "x" } });
  });
});
