import { afterEach, describe, expect, it, vi } from "vitest";

import { skipEmailVerification } from "@/lib/auth/verification-flag";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("skipEmailVerification", () => {
  it("skips only on a literal true", () => {
    for (const value of ["true", "TRUE", "True", " true ", "\ttrue\n"]) {
      vi.stubEnv("SKIP_EMAIL_VERIFICATION", value);
      expect(skipEmailVerification(), value).toBe(true);
    }
  });

  it("fails closed on anything else, so a typo can't disable verification", () => {
    for (const value of ["false", "", "0", "1", "yes", "ture", "skip", "TRUE!"]) {
      vi.stubEnv("SKIP_EMAIL_VERIFICATION", value);
      expect(skipEmailVerification(), value).toBe(false);
    }
  });

  it("requires verification when the variable is unset", () => {
    vi.stubEnv("SKIP_EMAIL_VERIFICATION", undefined);
    expect(skipEmailVerification()).toBe(false);
  });

  it("is read per call, so a deployment can flip it without a rebuild", () => {
    vi.stubEnv("SKIP_EMAIL_VERIFICATION", "true");
    expect(skipEmailVerification()).toBe(true);
    vi.stubEnv("SKIP_EMAIL_VERIFICATION", "false");
    expect(skipEmailVerification()).toBe(false);
  });
});
