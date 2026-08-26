import { afterEach, describe, expect, it, vi } from "vitest";

import { getAppUrl } from "@/lib/email/app-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getAppUrl", () => {
  it("returns the configured URL", () => {
    vi.stubEnv("APP_URL", "https://devstash.io");
    expect(getAppUrl()).toBe("https://devstash.io");
  });

  it("strips a trailing slash so callers can append a path", () => {
    vi.stubEnv("APP_URL", "https://devstash.io/");
    expect(`${getAppUrl()}/api/auth/verify`).toBe(
      "https://devstash.io/api/auth/verify",
    );
  });

  it("throws when APP_URL is missing rather than guessing a host", () => {
    vi.stubEnv("APP_URL", undefined);
    expect(() => getAppUrl()).toThrow("APP_URL is not set");
  });
});
