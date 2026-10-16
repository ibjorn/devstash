import type { PlanUsage } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

// Everything the entitlement checks need, in one query. Null on a stale
// session, as getBillingUser documents.
export async function getPlanUsage(userId: string): Promise<PlanUsage | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPro: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      _count: { select: { items: true, collections: true } },
    },
  });
  if (!user) return null;

  return {
    isPro: user.isPro,
    subscriptionStatus: user.subscriptionStatus,
    currentPeriodEnd: user.currentPeriodEnd,
    items: user._count.items,
    collections: user._count.collections,
  };
}
