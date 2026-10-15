import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { updateBilling } = vi.hoisted(() => ({ updateBilling: vi.fn() }));

vi.mock("@/lib/db/billing", () => ({ updateBilling }));

import { POST } from "@/app/api/webhooks/paystack/route";

const SECRET = "sk_test_secret";

function post(payload: unknown, signature?: string | null) {
  const body = typeof payload === "string" ? payload : JSON.stringify(payload);
  const headers = new Headers({ "Content-Type": "application/json" });
  const sig =
    signature === undefined
      ? createHmac("sha512", SECRET).update(body).digest("hex")
      : signature;
  if (sig !== null) headers.set("x-paystack-signature", sig);

  return POST(
    new Request("http://localhost/api/webhooks/paystack", {
      method: "POST",
      headers,
      body,
    }),
  );
}

const subscription = {
  subscription_code: "SUB_1",
  email_token: "tok_1",
  status: "active",
  next_payment_date: "2026-11-15T00:00:00.000Z",
  plan: { plan_code: "PLN_month" },
  customer: { customer_code: "CUS_1", id: 42, email: "dev@example.com" },
};

describe("POST /api/webhooks/paystack", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("PAYSTACK_SECRET_KEY", SECRET);
    vi.stubEnv("PAYSTACK_PLAN_CODE_MONTHLY", "PLN_month");
    vi.stubEnv("PAYSTACK_PLAN_CODE_YEARLY", "PLN_year");
    updateBilling.mockResolvedValue(1);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("401s on a bad or missing signature and touches nothing", async () => {
    const event = { event: "charge.success", data: {} };

    expect((await post(event, "deadbeef")).status).toBe(401);
    expect((await post(event, null)).status).toBe(401);
    expect(updateBilling).not.toHaveBeenCalled();
  });

  it("charge.success grants Pro to the known customer", async () => {
    const response = await post({
      event: "charge.success",
      data: { customer: subscription.customer, metadata: "" },
    });

    expect(response.status).toBe(200);
    expect(updateBilling).toHaveBeenCalledOnce();
    expect(updateBilling).toHaveBeenCalledWith(
      { paystackCustomerCode: "CUS_1" },
      { isPro: true },
    );
  });

  it("charge.success falls back to the metadata userId for a first payment", async () => {
    updateBilling.mockResolvedValueOnce(0);

    await post({
      event: "charge.success",
      data: {
        customer: subscription.customer,
        metadata: { userId: "usr_1" },
      },
    });

    expect(updateBilling).toHaveBeenLastCalledWith(
      { id: "usr_1" },
      { isPro: true, paystackCustomerCode: "CUS_1" },
    );
  });

  it("subscription.create stores the subscription for the customer", async () => {
    await post({ event: "subscription.create", data: subscription });

    expect(updateBilling).toHaveBeenCalledWith(
      { paystackCustomerCode: "CUS_1" },
      {
        isPro: true,
        paystackSubscriptionCode: "SUB_1",
        paystackEmailToken: "tok_1",
        subscriptionStatus: "active",
        currentPeriodEnd: new Date("2026-11-15T00:00:00.000Z"),
      },
    );
  });

  it("subscription.create ignores plans that aren't ours", async () => {
    const response = await post({
      event: "subscription.create",
      data: { ...subscription, plan: { plan_code: "PLN_other" } },
    });

    expect(response.status).toBe(200);
    expect(updateBilling).not.toHaveBeenCalled();
  });

  it("invoice.update refreshes the period on a paid renewal", async () => {
    await post({
      event: "invoice.update",
      data: {
        paid: true,
        subscription: {
          subscription_code: "SUB_1",
          next_payment_date: "2026-12-15T00:00:00.000Z",
        },
      },
    });

    expect(updateBilling).toHaveBeenCalledWith(
      { paystackSubscriptionCode: "SUB_1" },
      {
        isPro: true,
        subscriptionStatus: "active",
        currentPeriodEnd: new Date("2026-12-15T00:00:00.000Z"),
      },
    );
  });

  it("invoice.payment_failed flags attention but keeps Pro", async () => {
    await post({
      event: "invoice.payment_failed",
      data: { subscription: { subscription_code: "SUB_1" } },
    });

    expect(updateBilling).toHaveBeenCalledWith(
      { paystackSubscriptionCode: "SUB_1" },
      { subscriptionStatus: "attention" },
    );
  });

  it("subscription.not_renew keeps Pro and the existing period end", async () => {
    await post({
      event: "subscription.not_renew",
      data: {
        ...subscription,
        status: "non-renewing",
        next_payment_date: null,
      },
    });

    expect(updateBilling).toHaveBeenCalledWith(
      { paystackSubscriptionCode: "SUB_1" },
      { subscriptionStatus: "non-renewing", isPro: true },
    );
  });

  it("subscription.disable ends Pro for that subscription only", async () => {
    await post({
      event: "subscription.disable",
      data: { ...subscription, status: "complete", next_payment_date: null },
    });

    expect(updateBilling).toHaveBeenCalledWith(
      { paystackSubscriptionCode: "SUB_1" },
      { subscriptionStatus: "complete", isPro: false },
    );
  });

  it("acknowledges events it doesn't handle", async () => {
    const response = await post({ event: "transfer.success", data: {} });

    expect(response.status).toBe(200);
    expect(updateBilling).not.toHaveBeenCalled();
  });

  it("acknowledges a signed but malformed event rather than retrying forever", async () => {
    expect((await post("{not json")).status).toBe(200);
    expect(
      (await post({ event: "subscription.create", data: { nope: 1 } })).status,
    ).toBe(200);
    expect(updateBilling).not.toHaveBeenCalled();
  });

  it("500s on a database failure so Paystack retries", async () => {
    updateBilling.mockRejectedValue(new Error("db down"));

    const response = await post({
      event: "subscription.create",
      data: subscription,
    });

    expect(response.status).toBe(500);
  });

  it("a replayed event writes the same state again — a no-op", async () => {
    const event = { event: "subscription.create", data: subscription };

    await post(event);
    await post(event);

    expect(updateBilling).toHaveBeenCalledTimes(2);
    expect(updateBilling.mock.calls[1]).toEqual(updateBilling.mock.calls[0]);
  });
});
