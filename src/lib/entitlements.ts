import { PRO_TYPE_NAMES } from "@/lib/system-types";

// What a Free account can hold. Pro has no limits.
export const FREE_LIMITS = { items: 50, collections: 3 } as const;

// How long Pro outlives currentPeriodEnd on an expiring subscription. The
// subscription.disable webhook that ends it can arrive late — or, without a
// webhook tunnel, never — so the period end alone has to close it eventually.
const EXPIRY_GRACE_MS = 24 * 60 * 60 * 1000;

// Statuses whose access runs out at currentPeriodEnd unless Paystack tells us
// otherwise — non-renewing (cancelled) and attention (renewal failed)
const EXPIRING_STATUSES: ReadonlySet<string> = new Set([
  "non-renewing",
  "attention",
]);

/** Only a literal "true" turns gating on, as with SKIP_EMAIL_VERIFICATION. */
export function isBillingEnforced(): boolean {
  return process.env.BILLING_ENFORCED === "true";
}

/** The billing columns that decide Pro access. */
export interface ProAccessFields {
  isPro: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
}

/** A user's plan plus what they hold, before any create. */
export interface PlanUsage extends ProAccessFields {
  items: number;
  collections: number;
}

export function hasProAccess(plan: ProAccessFields, now = new Date()): boolean {
  if (!plan.isPro) return false;
  if (
    !plan.subscriptionStatus ||
    !EXPIRING_STATUSES.has(plan.subscriptionStatus)
  ) {
    return true;
  }
  if (!plan.currentPeriodEnd) return true;
  return now.getTime() < plan.currentPeriodEnd.getTime() + EXPIRY_GRACE_MS;
}

export type Denial = "ITEM_LIMIT" | "COLLECTION_LIMIT" | "PRO_TYPE" | "PRO_AI";

export const DENIAL_MESSAGES: Record<Denial, string> = {
  ITEM_LIMIT: `Free accounts hold up to ${FREE_LIMITS.items} items. Upgrade to Pro for unlimited.`,
  COLLECTION_LIMIT: `Free accounts have up to ${FREE_LIMITS.collections} collections. Upgrade to Pro for unlimited.`,
  PRO_TYPE: "File and image items are a Pro feature.",
  PRO_AI: "AI features are part of Pro.",
};

// Gating off, or Pro — either way nothing is limited
function isUnlimited(plan: ProAccessFields, now: Date): boolean {
  return !isBillingEnforced() || hasProAccess(plan, now);
}

export function checkItemCreate(
  plan: PlanUsage,
  typeName: string,
  now = new Date(),
): Denial | null {
  if (isUnlimited(plan, now)) return null;
  if (PRO_TYPE_NAMES.has(typeName)) return "PRO_TYPE";
  return plan.items >= FREE_LIMITS.items ? "ITEM_LIMIT" : null;
}

export function checkCollectionCreate(
  plan: PlanUsage,
  now = new Date(),
): Denial | null {
  if (isUnlimited(plan, now)) return null;
  return plan.collections >= FREE_LIMITS.collections
    ? "COLLECTION_LIMIT"
    : null;
}

/** Pro-only features: uploads now; AI, export and custom types once they ship. */
export function checkProFeature(
  plan: ProAccessFields,
  now = new Date(),
): boolean {
  return isUnlimited(plan, now);
}
