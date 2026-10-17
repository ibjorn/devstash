import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  auth,
  getBillingUser,
  updateBilling,
  initializeTransaction,
  getManageLink,
  createSubscription,
} = vi.hoisted(() => ({
  auth: vi.fn(),
  getBillingUser: vi.fn(),
  updateBilling: vi.fn(),
  initializeTransaction: vi.fn(),
  getManageLink: vi.fn(),
  createSubscription: vi.fn(),
}));

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/billing", () => ({ getBillingUser, updateBilling }));
vi.mock("@/lib/paystack", () => ({
  initializeTransaction,
  getManageLink,
  createSubscription,
}));

import {
  openSubscriptionManagement,
  resubscribe,
  startCheckout,
} from "@/actions/billing";

const USER_ID = "usr_1";

// startCheckout reads the real clock, so period ends are set relative to it
function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

const freeUser = {
  email: "dev@example.com",
  isPro: false,
  paystackCustomerCode: null,
  paystackSubscriptionCode: null,
  subscriptionStatus: null,
  currentPeriodEnd: null,
};

describe("startCheckout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("APP_URL", "https://devstash.test");
    vi.stubEnv("PAYSTACK_PLAN_CODE_MONTHLY", "PLN_month");
    vi.stubEnv("PAYSTACK_PLAN_CODE_YEARLY", "PLN_year");
    auth.mockResolvedValue({ user: { id: USER_ID } });
    getBillingUser.mockResolvedValue(freeUser);
    initializeTransaction.mockResolvedValue({
      authorization_url: "https://checkout.paystack.com/abc",
      reference: "ref_1",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses a signed-out caller without reaching Paystack", async () => {
    auth.mockResolvedValue(null);

    const result = await startCheckout("monthly");

    expect(result.success).toBe(false);
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("refuses a billing period that isn't monthly or yearly", async () => {
    const result = await startCheckout("weekly");

    expect(result.success).toBe(false);
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("refuses a second checkout while a subscription is live", async () => {
    for (const subscriptionStatus of ["active", "non-renewing", "attention"]) {
      getBillingUser.mockResolvedValue({
        ...freeUser,
        isPro: true,
        paystackSubscriptionCode: "SUB_1",
        subscriptionStatus,
        currentPeriodEnd: hoursFromNow(24 * 30),
      });
      expect((await startCheckout("yearly")).success).toBe(false);
    }
    // Paid but not yet synced
    getBillingUser.mockResolvedValue({ ...freeUser, isPro: true });
    expect((await startCheckout("yearly")).success).toBe(false);
    // Active can still charge, even if isPro has drifted
    getBillingUser.mockResolvedValue({
      ...freeUser,
      subscriptionStatus: "active",
    });
    expect((await startCheckout("yearly")).success).toBe(false);

    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("refuses a non-renewing user still within the grace", async () => {
    getBillingUser.mockResolvedValue({
      ...freeUser,
      isPro: true,
      paystackSubscriptionCode: "SUB_1",
      subscriptionStatus: "non-renewing",
      currentPeriodEnd: hoursFromNow(-23),
    });

    expect((await startCheckout("monthly")).success).toBe(false);
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("lets an expired non-renewing user subscribe again", async () => {
    getBillingUser.mockResolvedValue({
      ...freeUser,
      isPro: true,
      paystackSubscriptionCode: "SUB_1",
      subscriptionStatus: "non-renewing",
      currentPeriodEnd: hoursFromNow(-25),
    });

    const result = await startCheckout("monthly");

    expect(result.success).toBe(true);
    expect(initializeTransaction).toHaveBeenCalledTimes(1);
  });

  it("points an attention user at their card, expired or not", async () => {
    for (const hours of [24 * 30, -25]) {
      getBillingUser.mockResolvedValue({
        ...freeUser,
        isPro: true,
        paystackSubscriptionCode: "SUB_1",
        subscriptionStatus: "attention",
        currentPeriodEnd: hoursFromNow(hours),
      });

      const result = await startCheckout("monthly");
      expect(result.success).toBe(false);
      expect(result.error).toContain("Manage subscription");
    }
    expect(initializeTransaction).not.toHaveBeenCalled();
  });

  it("starts checkout on the chosen plan, tagged with the session user", async () => {
    const result = await startCheckout("yearly");

    expect(result).toEqual({
      success: true,
      data: { url: "https://checkout.paystack.com/abc" },
    });
    expect(initializeTransaction).toHaveBeenCalledWith({
      email: "dev@example.com",
      amount: 120_000,
      plan: "PLN_year",
      callback_url: "https://devstash.test/api/billing/callback",
      metadata: { userId: USER_ID },
    });
  });

  it("returns a generic error when Paystack fails", async () => {
    initializeTransaction.mockRejectedValue(new Error("Paystack down"));

    expect(await startCheckout("monthly")).toEqual({
      success: false,
      error: "Checkout is unavailable right now. Please try again.",
    });
  });
});

describe("openSubscriptionManagement", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    auth.mockResolvedValue({ user: { id: USER_ID } });
  });

  it("refuses a signed-out caller", async () => {
    auth.mockResolvedValue(null);

    expect((await openSubscriptionManagement()).success).toBe(false);
    expect(getManageLink).not.toHaveBeenCalled();
  });

  it("refuses when there's no subscription to manage", async () => {
    getBillingUser.mockResolvedValue(freeUser);

    expect((await openSubscriptionManagement()).success).toBe(false);
    expect(getManageLink).not.toHaveBeenCalled();
  });

  it("returns the hosted link for the session user's own subscription", async () => {
    getBillingUser.mockResolvedValue({
      ...freeUser,
      isPro: true,
      paystackSubscriptionCode: "SUB_1",
    });
    getManageLink.mockResolvedValue("https://paystack.com/manage/x");

    expect(await openSubscriptionManagement()).toEqual({
      success: true,
      data: { url: "https://paystack.com/manage/x" },
    });
    expect(getBillingUser).toHaveBeenCalledWith(USER_ID);
    expect(getManageLink).toHaveBeenCalledWith("SUB_1");
  });
});

describe("resubscribe", () => {
  const periodEnd = hoursFromNow(24 * 20);
  const cancelled = {
    ...freeUser,
    isPro: true,
    paystackCustomerCode: "CUS_1",
    paystackSubscriptionCode: "SUB_old",
    subscriptionStatus: "non-renewing",
    currentPeriodEnd: periodEnd,
  };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("PAYSTACK_PLAN_CODE_MONTHLY", "PLN_month");
    vi.stubEnv("PAYSTACK_PLAN_CODE_YEARLY", "PLN_year");
    auth.mockResolvedValue({ user: { id: USER_ID } });
    getBillingUser.mockResolvedValue(cancelled);
    createSubscription.mockResolvedValue({
      subscription_code: "SUB_new",
      email_token: "tok_new",
      status: "active",
      next_payment_date: null,
      plan: null,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("refuses a signed-out caller without reaching Paystack", async () => {
    auth.mockResolvedValue(null);

    expect((await resubscribe("monthly")).success).toBe(false);
    expect(createSubscription).not.toHaveBeenCalled();
  });

  it("refuses a billing period that isn't monthly or yearly", async () => {
    expect((await resubscribe("weekly")).success).toBe(false);
    expect(createSubscription).not.toHaveBeenCalled();
  });

  it("only resubscribes a cancelled subscription that's still paid up", async () => {
    for (const user of [
      freeUser,
      { ...cancelled, subscriptionStatus: "active" },
      { ...cancelled, subscriptionStatus: "attention" },
      // Expired past the grace — that's a fresh checkout, not a resume
      { ...cancelled, currentPeriodEnd: hoursFromNow(-48) },
    ]) {
      getBillingUser.mockResolvedValue(user);
      expect((await resubscribe("monthly")).success).toBe(false);
    }
    expect(createSubscription).not.toHaveBeenCalled();
    expect(updateBilling).not.toHaveBeenCalled();
  });

  it("starts the new subscription when the paid period ends", async () => {
    expect(await resubscribe("yearly")).toEqual({ success: true });

    expect(createSubscription).toHaveBeenCalledWith({
      customer: "CUS_1",
      plan: "PLN_year",
      start_date: periodEnd.toISOString(),
    });
    expect(updateBilling).toHaveBeenCalledWith(
      { id: USER_ID },
      expect.objectContaining({
        isPro: true,
        paystackSubscriptionCode: "SUB_new",
        paystackEmailToken: "tok_new",
        subscriptionStatus: "active",
        currentPeriodEnd: periodEnd,
      }),
    );
  });

  it("charges straight away once the period is over but still in grace", async () => {
    getBillingUser.mockResolvedValue({
      ...cancelled,
      currentPeriodEnd: hoursFromNow(-2),
    });

    expect((await resubscribe("monthly")).success).toBe(true);
    expect(createSubscription).toHaveBeenCalledWith({
      customer: "CUS_1",
      plan: "PLN_month",
    });
  });

  it("returns a generic error when Paystack fails, storing nothing", async () => {
    createSubscription.mockRejectedValue(new Error("boom"));

    expect(await resubscribe("monthly")).toEqual({
      success: false,
      error: "Could not resubscribe right now. Please try again.",
    });
    expect(updateBilling).not.toHaveBeenCalled();
  });
});
