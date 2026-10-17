import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { UpgradePlans } from "@/components/billing/UpgradePlans";
import { canStartCheckout } from "@/lib/billing";
import { getBillingUser } from "@/lib/db/billing";
import { requireUserId } from "@/lib/db/session-user";
import { getZarToUsdRate } from "@/lib/exchange-rate";

export const metadata: Metadata = {
  title: "Upgrade · DevStash",
};

export default async function UpgradePage() {
  const userId = await requireUserId();
  const [user, usdRate] = await Promise.all([
    getBillingUser(userId),
    getZarToUsdRate(),
  ]);

  if (!user) redirect("/api/auth/session-expired");
  // Already Pro, mid-sync or a failed renewal — settings explains which, and
  // startCheckout would refuse anyway
  if (!canStartCheckout(user)) redirect("/settings#billing");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Upgrade to Pro</h1>
        <p className="text-sm text-muted-foreground">
          Unlimited items and collections, file and image uploads, and the AI
          features. Billed in rand through Paystack — cancel anytime.
        </p>
      </div>

      <UpgradePlans usdRate={usdRate} />
    </div>
  );
}
