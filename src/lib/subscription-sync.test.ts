import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { listSubscriptions, updateBilling } = vi.hoisted(() => ({
  listSubscriptions: vi.fn(),
  updateBilling: vi.fn(),
}));

vi.mock("@/lib/paystack", () => ({
  listSubscriptions,
  fetchCustomer: vi.fn(),
}));
vi.mock("@/lib/db/billing", () => ({ updateBilling }));

import { syncSubscription } from "@/lib/subscription-sync";

const USER_ID = "usr_1";

function subscription(overrides: Record<string, unknown>) {
  return {
    subscription_code: "SUB_new",
    email_token: "tok",
    status: "active",
    next_payment_date: "2026-11-15T00:00:00.000Z",
    plan: { plan_code: "PLN_month" },
    createdAt: "2026-10-15T10:00:00.000Z",
    ...overrides,
  };
}

describe("syncSubscription", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("PAYSTACK_PLAN_CODE_MONTHLY", "PLN_month");
    vi.stubEnv("PAYSTACK_PLAN_CODE_YEARLY", "PLN_year");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("stores the live subscription on our plan for the user", async () => {
    listSubscriptions.mockResolvedValue([subscription({})]);

    await expect(syncSubscription(USER_ID, 42)).resolves.toBe(true);
    expect(listSubscriptions).toHaveBeenCalledWith({ customer: 42 });
    expect(updateBilling).toHaveBeenCalledWith(
      { id: USER_ID },
      expect.objectContaining({
        isPro: true,
        paystackSubscriptionCode: "SUB_new",
        subscriptionStatus: "active",
      }),
    );
  });

  it("never lets an old cancelled subscription revoke a fresh payment", async () => {
    // Paystack hasn't created the new subscription yet; only the old one exists
    listSubscriptions.mockResolvedValue([
      subscription({ subscription_code: "SUB_old", status: "cancelled" }),
    ]);

    await expect(syncSubscription(USER_ID, 42)).resolves.toBe(false);
    expect(updateBilling).not.toHaveBeenCalled();
  });

  it("ignores subscriptions to plans that aren't ours", async () => {
    listSubscriptions.mockResolvedValue([
      subscription({ plan: { plan_code: "PLN_other_product" } }),
    ]);

    await expect(syncSubscription(USER_ID, 42)).resolves.toBe(false);
    expect(updateBilling).not.toHaveBeenCalled();
  });

  it("picks the newest live one", async () => {
    listSubscriptions.mockResolvedValue([
      subscription({
        subscription_code: "SUB_a",
        createdAt: "2026-01-01T00:00:00Z",
      }),
      subscription({
        subscription_code: "SUB_b",
        createdAt: "2026-10-01T00:00:00Z",
      }),
    ]);

    await syncSubscription(USER_ID, 42);

    expect(updateBilling).toHaveBeenCalledWith(
      { id: USER_ID },
      expect.objectContaining({ paystackSubscriptionCode: "SUB_b" }),
    );
  });
});
