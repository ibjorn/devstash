import { prisma } from "@/lib/prisma";
import type { BillingUser } from "@/types/billing";

// Which row a Paystack event belongs to. Lifecycle events match on the
// subscription code, so a late event for an old subscription can't touch a
// newer one the user has since started.
export type BillingMatch =
  | { id: string }
  | { paystackCustomerCode: string }
  | { paystackSubscriptionCode: string };

export interface BillingUpdate {
  isPro?: boolean;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  paystackEmailToken?: string;
  subscriptionStatus?: string;
  currentPeriodEnd?: Date | null;
}

// Null on a stale session, as getProfileUser documents
export async function getBillingUser(
  userId: string,
): Promise<BillingUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      isPro: true,
      paystackCustomerCode: true,
      paystackSubscriptionCode: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
    },
  });
}

/**
 * Sets billing fields on whichever user matches. Every update is an absolute
 * set, never an increment or toggle, so Paystack's retries and the overlap
 * between the callback and the webhook are harmless. Returns how many rows
 * matched — 0 means the event isn't for anyone we know (yet).
 */
export async function updateBilling(
  match: BillingMatch,
  data: BillingUpdate,
): Promise<number> {
  const { count } = await prisma.user.updateMany({ where: match, data });
  return count;
}
