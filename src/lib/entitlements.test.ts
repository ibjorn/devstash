import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkCollectionCreate,
  checkItemCreate,
  checkProFeature,
  DENIAL_MESSAGES,
  FREE_LIMITS,
  hasProAccess,
  isBillingEnforced,
  type PlanUsage,
} from "@/lib/entitlements";

const NOW = new Date("2026-10-16T12:00:00.000Z");
const HOUR = 60 * 60 * 1000;

function hoursAgo(hours: number): Date {
  return new Date(NOW.getTime() - hours * HOUR);
}

const free: PlanUsage = {
  isPro: false,
  subscriptionStatus: null,
  currentPeriodEnd: null,
  items: 0,
  collections: 0,
};

const pro: PlanUsage = {
  ...free,
  isPro: true,
  subscriptionStatus: "active",
  currentPeriodEnd: new Date("2026-11-16T12:00:00.000Z"),
};

const expired: PlanUsage = {
  ...pro,
  subscriptionStatus: "non-renewing",
  currentPeriodEnd: hoursAgo(25),
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("isBillingEnforced", () => {
  it('is on only for a literal "true"', () => {
    vi.stubEnv("BILLING_ENFORCED", "true");
    expect(isBillingEnforced()).toBe(true);
  });

  it("is off for anything else, and when unset", () => {
    for (const value of ["TRUE", "1", "false", ""]) {
      vi.stubEnv("BILLING_ENFORCED", value);
      expect(isBillingEnforced()).toBe(false);
    }
    vi.stubEnv("BILLING_ENFORCED", undefined);
    expect(isBillingEnforced()).toBe(false);
  });
});

describe("checks with enforcement off", () => {
  it("allows everything, for Free and expired users alike", () => {
    vi.stubEnv("BILLING_ENFORCED", "false");

    for (const plan of [free, expired]) {
      const full = { ...plan, items: 500, collections: 50 };
      expect(checkItemCreate(full, "Snippet", NOW)).toBeNull();
      expect(checkItemCreate(full, "File", NOW)).toBeNull();
      expect(checkItemCreate(full, "Image", NOW)).toBeNull();
      expect(checkCollectionCreate(full, NOW)).toBeNull();
      expect(checkProFeature(full, NOW)).toBe(true);
    }
  });
});

describe("checks with enforcement on", () => {
  it("caps a Free user at the item limit, counting before the create", () => {
    vi.stubEnv("BILLING_ENFORCED", "true");

    expect(checkItemCreate({ ...free, items: 49 }, "Snippet", NOW)).toBeNull();
    expect(checkItemCreate({ ...free, items: 50 }, "Snippet", NOW)).toBe(
      "ITEM_LIMIT",
    );
  });

  it("denies a Free user File and Image even at zero items", () => {
    vi.stubEnv("BILLING_ENFORCED", "true");

    expect(checkItemCreate(free, "File", NOW)).toBe("PRO_TYPE");
    expect(checkItemCreate(free, "Image", NOW)).toBe("PRO_TYPE");
  });

  it("caps a Free user at the collection limit", () => {
    vi.stubEnv("BILLING_ENFORCED", "true");

    expect(checkCollectionCreate({ ...free, collections: 2 }, NOW)).toBeNull();
    expect(checkCollectionCreate({ ...free, collections: 3 }, NOW)).toBe(
      "COLLECTION_LIMIT",
    );
    expect(checkProFeature(free, NOW)).toBe(false);
  });

  it("lets Pro past every limit", () => {
    vi.stubEnv("BILLING_ENFORCED", "true");
    const full = { ...pro, items: 500, collections: 50 };

    expect(checkItemCreate(full, "Snippet", NOW)).toBeNull();
    expect(checkItemCreate(full, "File", NOW)).toBeNull();
    expect(checkCollectionCreate(full, NOW)).toBeNull();
    expect(checkProFeature(full, NOW)).toBe(true);
  });

  it("treats a non-renewing subscription past the grace as Free", () => {
    vi.stubEnv("BILLING_ENFORCED", "true");

    expect(checkItemCreate({ ...expired, items: 50 }, "Snippet", NOW)).toBe(
      "ITEM_LIMIT",
    );
    expect(checkItemCreate(expired, "File", NOW)).toBe("PRO_TYPE");
    expect(checkCollectionCreate({ ...expired, collections: 3 }, NOW)).toBe(
      "COLLECTION_LIMIT",
    );
    expect(checkProFeature(expired, NOW)).toBe(false);
  });
});

describe("hasProAccess", () => {
  it("keeps active, pending and period-less Pro", () => {
    expect(hasProAccess(pro, NOW)).toBe(true);
    expect(hasProAccess({ ...pro, subscriptionStatus: null }, NOW)).toBe(true);
    for (const subscriptionStatus of ["non-renewing", "attention"]) {
      expect(
        hasProAccess(
          { ...pro, subscriptionStatus, currentPeriodEnd: null },
          NOW,
        ),
      ).toBe(true);
    }
  });

  it.each(["non-renewing", "attention"])(
    "expires %s 24 hours past the period end",
    (subscriptionStatus) => {
      const at = (currentPeriodEnd: Date) =>
        hasProAccess({ ...pro, subscriptionStatus, currentPeriodEnd }, NOW);

      expect(at(new Date(NOW.getTime() + HOUR))).toBe(true);
      expect(at(hoursAgo(23))).toBe(true);
      expect(at(hoursAgo(25))).toBe(false);
    },
  );

  it("never grants Pro to an isPro: false user, whatever the status", () => {
    for (const subscriptionStatus of [
      null,
      "active",
      "non-renewing",
      "attention",
    ]) {
      expect(
        hasProAccess({ ...pro, isPro: false, subscriptionStatus }, NOW),
      ).toBe(false);
    }
  });
});

describe("DENIAL_MESSAGES", () => {
  it("quote the current Free limits", () => {
    expect(DENIAL_MESSAGES.ITEM_LIMIT).toContain(String(FREE_LIMITS.items));
    expect(DENIAL_MESSAGES.COLLECTION_LIMIT).toContain(
      String(FREE_LIMITS.collections),
    );
  });
});
