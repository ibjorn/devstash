import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  billingForPlanCode,
  billingState,
  canStartCheckout,
  describeProPrice,
  isChargingSubscriptionStatus,
  planCodeFor,
  subscriptionState,
} from "@/lib/billing";

describe("describeProPrice", () => {
  it("leads with approximate USD and states the rand it's billed as", () => {
    expect(describeProPrice("monthly", 0.0598)).toEqual({
      amount: "≈ $8.07",
      period: "/ month",
      note: "Billed as R135 monthly. Cancel anytime.",
    });
    expect(describeProPrice("yearly", 0.0598)).toEqual({
      amount: "≈ $71.76",
      period: "/ year",
      note: "Billed as R1,200 yearly — about R100 a month.",
    });
  });

  it("falls back to rand with no dollars anywhere when there's no rate", () => {
    for (const billing of ["monthly", "yearly"] as const) {
      const price = describeProPrice(billing, null);
      expect(price.amount).toBe(billing === "monthly" ? "R135" : "R1,200");
      expect(JSON.stringify(price)).not.toContain("$");
    }
  });
});

describe("plan codes", () => {
  beforeEach(() => {
    vi.stubEnv("PAYSTACK_PLAN_CODE_MONTHLY", "PLN_month");
    vi.stubEnv("PAYSTACK_PLAN_CODE_YEARLY", "PLN_year");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("maps periods to configured codes and back", () => {
    expect(planCodeFor("yearly")).toBe("PLN_year");
    expect(billingForPlanCode("PLN_month")).toBe("monthly");
    expect(billingForPlanCode("PLN_someone_else")).toBeNull();
  });

  it("throws rather than checking out against an unset plan", () => {
    vi.stubEnv("PAYSTACK_PLAN_CODE_MONTHLY", "");
    expect(() => planCodeFor("monthly")).toThrow(
      "PAYSTACK_PLAN_CODE_MONTHLY is not set",
    );
  });
});

describe("canStartCheckout", () => {
  const NOW = new Date("2026-10-16T12:00:00.000Z");
  const free = {
    isPro: false,
    subscriptionStatus: null,
    currentPeriodEnd: null,
  };
  const pro = {
    isPro: true,
    subscriptionStatus: "active",
    currentPeriodEnd: new Date("2026-11-16T12:00:00.000Z"),
  };
  const lapsed = new Date("2026-10-14T12:00:00.000Z");

  it("lets a Free user and an expired cancellation through", () => {
    expect(canStartCheckout(free, NOW)).toBe(true);
    expect(
      canStartCheckout(
        {
          ...pro,
          subscriptionStatus: "non-renewing",
          currentPeriodEnd: lapsed,
        },
        NOW,
      ),
    ).toBe(true);
  });

  it("refuses Pro, including paid-but-unsynced and a running cancellation", () => {
    expect(canStartCheckout(pro, NOW)).toBe(false);
    expect(canStartCheckout({ ...pro, subscriptionStatus: null }, NOW)).toBe(
      false,
    );
    expect(
      canStartCheckout({ ...pro, subscriptionStatus: "non-renewing" }, NOW),
    ).toBe(false);
  });

  it("refuses a subscription Paystack can still charge, even without Pro", () => {
    expect(
      canStartCheckout(
        { ...pro, subscriptionStatus: "attention", currentPeriodEnd: lapsed },
        NOW,
      ),
    ).toBe(false);
    expect(
      canStartCheckout({ ...free, subscriptionStatus: "active" }, NOW),
    ).toBe(false);
  });
});

describe("isChargingSubscriptionStatus", () => {
  it.each(["active", "attention"])("is true for %s", (status) => {
    expect(isChargingSubscriptionStatus(status)).toBe(true);
  });

  it.each(["non-renewing", "complete", "completed", "cancelled", null])(
    "is false for %s",
    (status) => {
      expect(isChargingSubscriptionStatus(status)).toBe(false);
    },
  );
});

describe("subscriptionState", () => {
  const subscription = {
    subscription_code: "SUB_1",
    email_token: "tok",
    status: "active",
    next_payment_date: "2026-11-15T00:00:00.000Z",
  };

  it("keeps Pro while the subscription lives, including non-renewing", () => {
    for (const status of ["active", "non-renewing", "attention"]) {
      expect(subscriptionState({ ...subscription, status }).isPro).toBe(true);
    }
  });

  it("ends Pro once Paystack reports it over", () => {
    for (const status of ["complete", "completed", "cancelled"]) {
      expect(subscriptionState({ ...subscription, status }).isPro).toBe(false);
    }
  });

  it("maps codes and the next payment date", () => {
    expect(subscriptionState(subscription)).toEqual({
      isPro: true,
      paystackSubscriptionCode: "SUB_1",
      paystackEmailToken: "tok",
      subscriptionStatus: "active",
      currentPeriodEnd: new Date("2026-11-15T00:00:00.000Z"),
    });
  });
});

describe("billingState", () => {
  const NOW = new Date("2026-10-16T12:00:00.000Z");
  const hoursAgo = (hours: number) =>
    new Date(NOW.getTime() - hours * 60 * 60 * 1000);

  const pro = {
    isPro: true,
    paystackSubscriptionCode: "SUB_1",
    subscriptionStatus: "active",
    currentPeriodEnd: new Date("2026-11-16T12:00:00.000Z"),
  };

  it("is free without Pro, whatever the stale status says", () => {
    expect(billingState({ ...pro, isPro: false })).toBe("free");
  });

  it("is pending while paid Pro has no subscription synced", () => {
    expect(
      billingState({
        ...pro,
        paystackSubscriptionCode: null,
        subscriptionStatus: null,
      }),
    ).toBe("pending");
  });

  it("surfaces non-renewing and attention", () => {
    expect(billingState(pro)).toBe("active");
    expect(billingState({ ...pro, subscriptionStatus: "non-renewing" })).toBe(
      "non-renewing",
    );
    expect(billingState({ ...pro, subscriptionStatus: "attention" })).toBe(
      "attention",
    );
  });

  it("turns a non-renewing period that ran out past the grace into free", () => {
    const nonRenewing = { ...pro, subscriptionStatus: "non-renewing" };

    expect(
      billingState({ ...nonRenewing, currentPeriodEnd: hoursAgo(25) }, NOW),
    ).toBe("free");
    expect(
      billingState({ ...nonRenewing, currentPeriodEnd: hoursAgo(23) }, NOW),
    ).toBe("non-renewing");
  });

  it("keeps showing attention past the grace, so nobody subscribes twice", () => {
    expect(
      billingState(
        {
          ...pro,
          subscriptionStatus: "attention",
          currentPeriodEnd: hoursAgo(25),
        },
        NOW,
      ),
    ).toBe("attention");
  });
});
