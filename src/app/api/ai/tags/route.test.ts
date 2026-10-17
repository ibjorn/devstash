import { APIConnectionTimeoutError, APIError } from "openai";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, getPlanUsage, checkRateLimit, parse } = vi.hoisted(() => ({
  auth: vi.fn(),
  getPlanUsage: vi.fn(),
  checkRateLimit: vi.fn(),
  parse: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/entitlements", () => ({ getPlanUsage }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit,
}));
vi.mock("@/lib/openai", () => ({
  getOpenAI: () => ({ responses: { parse } }),
  aiModel: () => "test-model",
}));

import { POST } from "@/app/api/ai/tags/route";

const USER_ID = "usr_1";
const UPSTREAM_SECRET = "org-acme quota details";

const valid = {
  typeName: "Snippet",
  title: "useDebounce hook",
  content: "export function useDebounce() {}",
  language: "typescript",
  existingTags: ["react"],
};

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/ai/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function completed(tags: string[]) {
  return { status: "completed", output_parsed: { tags }, usage: undefined };
}

function upstream(status: number, code: string, type?: string) {
  return APIError.generate(
    status,
    { error: { code, type, message: UPSTREAM_SECRET } },
    undefined,
    new Headers(),
  );
}

describe("POST /api/ai/tags", () => {
  it("tells an empty budget apart from OpenAI being busy", async () => {
    parse.mockRejectedValue(
      upstream(429, "credit_balance_exhausted", "insufficient_quota"),
    );

    const body = await (await post(valid)).json();

    expect(body.error).toBe("AI features are temporarily unavailable.");
    expect(console.error).toHaveBeenCalledWith(
      "OpenAI quota exhausted",
      expect.anything(),
    );
  });

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    auth.mockResolvedValue({ user: { id: USER_ID } });
    getPlanUsage.mockResolvedValue({
      isPro: true,
      subscriptionStatus: "active",
      currentPeriodEnd: null,
      items: 0,
      collections: 0,
    });
    checkRateLimit.mockResolvedValue({ success: true, retryAfterSeconds: 0 });
    parse.mockResolvedValue(completed(["hooks", "typescript"]));
  });

  it("never calls OpenAI for a refused request", async () => {
    auth.mockResolvedValue(null);
    expect((await post(valid)).status).toBe(401);

    auth.mockResolvedValue({ user: { id: USER_ID } });
    checkRateLimit.mockResolvedValue({ success: false, retryAfterSeconds: 9 });
    expect((await post(valid)).status).toBe(429);

    expect(parse).not.toHaveBeenCalled();
  });

  it("400s a draft with neither a title nor content", async () => {
    const response = await post({ ...valid, title: " ", content: "  " });

    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe(
      "Add a title or some content first.",
    );
    expect(parse).not.toHaveBeenCalled();
  });

  it("400s over-length content rather than sending it", async () => {
    const response = await post({ ...valid, content: "x".repeat(100_001) });

    expect(response.status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it("returns the suggested tags", async () => {
    const response = await post(valid);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      data: { tags: ["hooks", "typescript"] },
    });
  });

  it("cleans the model's tags: lowercased, deduped, minus existing ones, at most 5", async () => {
    parse.mockResolvedValue(
      completed(["React", "#Hooks", "hooks", "a, b", "x".repeat(51), "c", "d"]),
    );

    const body = await (await post(valid)).json();

    expect(body.data.tags).toEqual(["hooks", "a", "b", "c", "d"]);
  });

  it("sends the cost and privacy settings, with a hashed user id", async () => {
    await post(valid);

    const params = parse.mock.calls[0][0];
    expect(params).toMatchObject({
      model: "test-model",
      store: false,
      max_output_tokens: 200,
      reasoning: { effort: "none" },
    });
    expect(params.safety_identifier).toMatch(/^[0-9a-f]{64}$/);
    expect(params.safety_identifier).not.toContain(USER_ID);
    expect(params.instructions).not.toContain(valid.content);
    expect(params.input).toContain(valid.content);
  });

  it("truncates over-cap content to 8,000 chars and says so, rather than rejecting", async () => {
    const content = "a".repeat(8_000) + "Z".repeat(2_000);

    const response = await post({ ...valid, content });

    expect(response.status).toBe(200);
    const { input } = parse.mock.calls[0][0];
    expect(input).toContain("a".repeat(8_000));
    expect(input).not.toContain("Z");
    expect(input).toContain("truncated to its first 8,000 characters");
  });

  it("doesn't mention truncation for content under the cap", async () => {
    await post(valid);

    expect(parse.mock.calls[0][0].input).not.toContain("truncated");
  });

  it("422s an incomplete response instead of showing a partial result", async () => {
    parse.mockResolvedValue({
      status: "incomplete",
      incomplete_details: { reason: "max_output_tokens" },
      output_parsed: { tags: ["half"] },
    });

    const response = await post(valid);

    expect(response.status).toBe(422);
    expect((await response.json()).error).toBe(
      "Couldn't suggest anything for this item.",
    );
  });

  it("422s a refusal (no parsed output)", async () => {
    parse.mockResolvedValue({ status: "completed", output_parsed: null });

    expect((await post(valid)).status).toBe(422);
  });

  it.each([
    ["exhausted quota", upstream(429, "insufficient_quota"), 503],
    [
      "an empty credit balance",
      upstream(429, "credit_balance_exhausted", "insufficient_quota"),
      503,
    ],
    ["OpenAI's own rate limit", upstream(429, "rate_limit_exceeded"), 503],
    ["an OpenAI outage", upstream(500, "server_error"), 503],
    ["a bad request (our bug)", upstream(400, "invalid_request_error"), 500],
    ["a revoked key", upstream(401, "invalid_api_key"), 500],
    ["a timeout", new APIConnectionTimeoutError(), 504],
    ["an unknown throw", new Error(UPSTREAM_SECRET), 500],
  ])("maps %s to %i without leaking OpenAI's message", async (_, error, status) => {
    parse.mockRejectedValue(error);

    const response = await post(valid);
    const body = await response.json();

    expect(response.status).toBe(status);
    expect(body.success).toBe(false);
    expect(body.error).not.toContain(UPSTREAM_SECRET);
    // Our 429 is reserved for the user's own limit
    expect(response.headers.get("Retry-After")).toBeNull();
  });
});
