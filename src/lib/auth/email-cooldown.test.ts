import { describe, expect, it } from "vitest";

import {
  EMAIL_COOLDOWN_MS,
  EMAIL_COOLDOWN_SECONDS,
  formatCountdown,
} from "@/lib/auth/email-cooldown";

describe("email cooldown", () => {
  it("keeps the seconds form in step with the milliseconds", () => {
    expect(EMAIL_COOLDOWN_SECONDS * 1000).toBe(EMAIL_COOLDOWN_MS);
  });

  it("formats a countdown as m:ss", () => {
    expect(formatCountdown(300)).toBe("5:00");
    expect(formatCountdown(299)).toBe("4:59");
    expect(formatCountdown(61)).toBe("1:01");
    expect(formatCountdown(9)).toBe("0:09");
    expect(formatCountdown(0)).toBe("0:00");
  });

  it("never renders a negative countdown", () => {
    expect(formatCountdown(-5)).toBe("0:00");
  });
});
