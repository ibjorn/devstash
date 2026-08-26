import { describe, expect, it } from "vitest";

import {
  RATE_LIMITS,
  clientIp,
  ipEmailKey,
  rateLimitMessage,
} from "@/lib/rate-limit";

// Only the pure helpers are covered here. checkRateLimit/peekRateLimit/
// clearRateLimit talk to Upstash, and with no credentials in the test env they
// fail open by design — asserting on that would test the absence of config
// rather than the limiter.

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
