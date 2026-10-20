import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPlanUsage } = vi.hoisted(() => ({ getPlanUsage: vi.fn() }));

vi.mock("@/lib/db/entitlements", () => ({ getPlanUsage }));

import { DENIAL_MESSAGES, type PlanUsage } from "@/lib/entitlements";
import { planDenial } from "@/lib/plan-gate";

const USER_ID = "usr_1";
const SIGNED_OUT = "You need to be signed in to create things.";

const PLAN: PlanUsage = {
  isPro: false,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  items: 3,
  collections: 1,
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("planDenial", () => {
  it("lets the create through when the check finds nothing to deny", async () => {
    getPlanUsage.mockResolvedValue(PLAN);
    const check = vi.fn().mockReturnValue(null);

    await expect(planDenial(USER_ID, check, SIGNED_OUT)).resolves.toBeNull();
    expect(getPlanUsage).toHaveBeenCalledWith(USER_ID);
    expect(check).toHaveBeenCalledWith(PLAN);
  });

  it("refuses with the denial's message and flags it as an upgrade", async () => {
    getPlanUsage.mockResolvedValue(PLAN);

    await expect(
      planDenial(USER_ID, () => "ITEM_LIMIT", SIGNED_OUT),
    ).resolves.toEqual({
      success: false,
      error: DENIAL_MESSAGES.ITEM_LIMIT,
      upgrade: true,
    });
  });

  it("treats a session whose user row is gone as signed out", async () => {
    getPlanUsage.mockResolvedValue(null);
    const check = vi.fn();

    await expect(planDenial(USER_ID, check, SIGNED_OUT)).resolves.toEqual({
      success: false,
      error: SIGNED_OUT,
    });
    expect(check).not.toHaveBeenCalled();
  });
});
