import { beforeEach, describe, expect, it, vi } from "vitest";

const { auth, verifyTransaction, updateBilling, syncSubscription } = vi.hoisted(
  () => ({
    auth: vi.fn(),
    verifyTransaction: vi.fn(),
    updateBilling: vi.fn(),
    syncSubscription: vi.fn(),
  }),
);

vi.mock("@/auth", () => ({ auth }));
vi.mock("@/lib/db/billing", () => ({ updateBilling }));
vi.mock("@/lib/subscription-sync", () => ({ syncSubscription }));
vi.mock("@/lib/paystack", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paystack")>()),
  verifyTransaction,
}));

import { GET } from "@/app/api/billing/callback/route";

const USER_ID = "usr_1";

const paid = {
  status: "success",
  reference: "ref_1",
  customer: { id: 42, customer_code: "CUS_1", email: "dev@example.com" },
  metadata: { userId: USER_ID },
};

function get(query = "?trxref=ref_1&reference=ref_1") {
  return GET(new Request(`http://localhost/api/billing/callback${query}`));
}

function location(response: Response) {
  const url = new URL(response.headers.get("location") ?? "");
  return `${url.pathname}${url.search}${url.hash}`;
}

describe("GET /api/billing/callback", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    auth.mockResolvedValue({ user: { id: USER_ID } });
    verifyTransaction.mockResolvedValue(paid);
    syncSubscription.mockResolvedValue(true);
  });

  it("sends a signed-out visitor through sign-in and back here", async () => {
    auth.mockResolvedValue(null);

    const response = await get();

    expect(location(response)).toBe(
      `/sign-in?callbackUrl=${encodeURIComponent("/api/billing/callback?trxref=ref_1&reference=ref_1")}`,
    );
    expect(verifyTransaction).not.toHaveBeenCalled();
  });

  it("fails without a reference", async () => {
    expect(location(await get(""))).toBe("/settings?billing=failed#billing");
    expect(verifyTransaction).not.toHaveBeenCalled();
  });

  it("grants nothing when Paystack says the payment didn't succeed", async () => {
    verifyTransaction.mockResolvedValue({ ...paid, status: "abandoned" });

    expect(location(await get())).toBe("/settings?billing=failed#billing");
    expect(updateBilling).not.toHaveBeenCalled();
  });

  it("grants nothing when verification itself fails", async () => {
    verifyTransaction.mockRejectedValue(new Error("Transaction not found"));

    expect(location(await get())).toBe("/settings?billing=failed#billing");
    expect(updateBilling).not.toHaveBeenCalled();
  });

  it("refuses someone else's payment reference", async () => {
    verifyTransaction.mockResolvedValue({
      ...paid,
      metadata: { userId: "usr_other" },
    });

    expect(location(await get())).toBe("/settings?billing=failed#billing");
    expect(updateBilling).not.toHaveBeenCalled();
    expect(syncSubscription).not.toHaveBeenCalled();
  });

  it("verifies server-side, grants Pro and syncs the subscription", async () => {
    const response = await get();

    expect(verifyTransaction).toHaveBeenCalledWith("ref_1");
    expect(updateBilling).toHaveBeenCalledWith(
      { id: USER_ID },
      { isPro: true, paystackCustomerCode: "CUS_1" },
    );
    expect(syncSubscription).toHaveBeenCalledWith(USER_ID, 42);
    expect(location(response)).toBe("/settings?billing=success#billing");
  });

  it("still succeeds when the subscription sync fails", async () => {
    syncSubscription.mockRejectedValue(new Error("Paystack down"));

    expect(location(await get())).toBe("/settings?billing=success#billing");
  });
});
