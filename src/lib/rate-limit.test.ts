import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  RATE_LIMITS,
  clientIp,
  ipEmailKey,
  rateLimitMessage,
} from "@/lib/rate-limit";

// The Upstash clients never leave the process: `limit` stands in for a
// Ratelimit instance's own method, for the failClosed tests at the bottom.
// Everything above them is a pure helper.
const { limit } = vi.hoisted(() => ({ limit: vi.fn() }));

vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow() {
      return {};
    }
    limit = limit;
  },
}));

describe("clientIp", () => {
  const headers = (init: Record<string, string>) => new Headers(init);

  it("takes the originating client from an x-forwarded-for chain", () => {
    expect(
      clientIp(headers({ "x-forwarded-for": "203.0.113.7, 70.41.3.18" })),
    ).toBe("203.0.113.7");
  });

  it("trims whitespace around the entry", () => {
    expect(clientIp(headers({ "x-forwarded-for": "  203.0.113.7  " }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(headers({ "x-real-ip": "203.0.113.9" }))).toBe(
      "203.0.113.9",
    );
  });

  it("buckets requests with no usable header together rather than exempting them", () => {
    expect(clientIp(headers({}))).toBe("unknown-ip");
    expect(clientIp(headers({ "x-forwarded-for": "" }))).toBe("unknown-ip");
    expect(clientIp(headers({ "x-forwarded-for": "  ", "x-real-ip": " " }))).toBe(
      "unknown-ip",
    );
  });
});

describe("ipEmailKey", () => {
  it("narrows an IP to one target address", () => {
    expect(ipEmailKey("203.0.113.7", "dev@devstash.io")).toBe(
      "203.0.113.7|dev@devstash.io",
    );
  });

  it("keeps two addresses from the same IP on separate buckets", () => {
    expect(ipEmailKey("203.0.113.7", "a@b.com")).not.toBe(
      ipEmailKey("203.0.113.7", "c@d.com"),
    );
  });
});

describe("rateLimitMessage", () => {
  it("rounds short waits up to a minute", () => {
    expect(rateLimitMessage(1)).toBe(
      "Too many attempts. Please try again in a minute.",
    );
    expect(rateLimitMessage(90)).toContain("in a minute");
  });

  it("reports minutes below an hour", () => {
    expect(rateLimitMessage(91)).toContain("in 2 minutes");
    expect(rateLimitMessage(600)).toContain("in 10 minutes");
    expect(rateLimitMessage(3540)).toContain("in 59 minutes");
  });

  it("reports hours at an hour and above", () => {
    expect(rateLimitMessage(3600)).toContain("in an hour");
    expect(rateLimitMessage(3471)).toContain("in 58 minutes");
    expect(rateLimitMessage(7200)).toContain("in 2 hours");
  });
});

describe("RATE_LIMITS", () => {
  it("keeps the per-IP sign-in ceiling looser than the per-account one", () => {
    // The per-account limit stops someone hammering one address; the per-IP
    // ceiling catches credential stuffing, which never trips a per-account
    // budget — but a whole office behind one NAT shares that IP
    expect(RATE_LIMITS.signInPerIp.limit).toBeGreaterThan(
      RATE_LIMITS.signIn.limit,
    );
  });

  it("gives every limit a positive budget and a window", () => {
    for (const [name, { limit, window }] of Object.entries(RATE_LIMITS)) {
      expect(limit, name).toBeGreaterThan(0);
      expect(window, name).toMatch(/^\d+\s?(ms|s|m|h|d)$/);
    }
  });
});

describe("checkRateLimit failClosed", () => {
  // The module caches its Redis client (or its absence) on first use, so each
  // test imports a fresh copy under its own env
  async function freshCheck() {
    vi.resetModules();
    return (await import("@/lib/rate-limit")).checkRateLimit;
  }

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("with no Upstash credentials", () => {
    beforeEach(() => {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    });

    it("refuses as unavailable, and says why server-side", async () => {
      const checkRateLimit = await freshCheck();

      const result = await checkRateLimit("ai", "usr_1", { failClosed: true });

      expect(result).toMatchObject({ success: false, unavailable: true });
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("unavailable: rate limiter not configured"),
        "AI",
      );
    });

    it("has no environment exception", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const checkRateLimit = await freshCheck();

      const result = await checkRateLimit("ai", "usr_1", { failClosed: true });

      expect(result.success).toBe(false);
    });

    it("still fails open without the option", async () => {
      const checkRateLimit = await freshCheck();

      const result = await checkRateLimit("signIn", "usr_1");

      expect(result.success).toBe(true);
      expect(result.unavailable).toBeUndefined();
    });
  });

  describe("with Upstash configured", () => {
    beforeEach(() => {
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.test");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    });

    it("refuses as unavailable when Upstash is unreachable", async () => {
      limit.mockRejectedValue(new Error("fetch failed"));
      const checkRateLimit = await freshCheck();

      const result = await checkRateLimit("ai", "usr_1", { failClosed: true });

      expect(result).toMatchObject({ success: false, unavailable: true });
    });

    it("allows the same outage through without the option", async () => {
      limit.mockRejectedValue(new Error("fetch failed"));
      const checkRateLimit = await freshCheck();

      expect((await checkRateLimit("signIn", "usr_1")).success).toBe(true);
    });

    it("reports an over-limit key as a plain refusal, not unavailable", async () => {
      limit.mockResolvedValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 30_000,
      });
      const checkRateLimit = await freshCheck();

      const result = await checkRateLimit("ai", "usr_1", { failClosed: true });

      expect(result.success).toBe(false);
      expect(result.unavailable).toBeUndefined();
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });
  });
});
