"use client";

import { toast } from "sonner";

import { UpgradeOptions } from "@/components/settings/PlanOptions";
import { SubscriptionStatus } from "@/components/settings/SubscriptionStatus";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useHandoffToast } from "@/hooks/use-handoff-toast";
import type { BillingState } from "@/lib/billing";
import { FREE_LIMITS } from "@/lib/entitlements";

interface BillingSectionProps {
  state: BillingState;
  /** Next payment, or when access ends — formatted on the server. */
  periodEnd: string | null;
  usdRate: number | null;
  /** ?billing= from the checkout callback, toasted once then stripped. */
  outcome?: string;
  /** BILLING_ENFORCED, read on the server — the Free limits are real. */
  enforced: boolean;
  /** What the account holds, for the Free usage line. */
  usage: { items: number; collections: number };
  /** A failed renewal has run past its grace period and Pro is off. */
  paused: boolean;
}

const OUTCOME_TOASTS: Record<string, () => void> = {
  success: () =>
    toast.success("Welcome to Pro — thanks for subscribing!", {
      id: "billing-outcome",
    }),
  failed: () =>
    toast.error(
      "We couldn't confirm that payment. If you were charged, Pro will appear here shortly.",
      { id: "billing-outcome" },
    ),
};

/** Settings → Billing: upgrade options on Free, subscription status on Pro. */
export function BillingSection({
  state,
  periodEnd,
  usdRate,
  outcome,
  enforced,
  usage,
  paused,
}: BillingSectionProps) {
  // An unknown outcome toasts nothing but is still stripped
  useHandoffToast(outcome, "billing", (value) => OUTCOME_TOASTS[value]?.());

  const isFree = state === "free";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isFree ? "DevStash Pro" : "You're on Pro"}
        </CardTitle>
        <CardDescription>
          {isFree
            ? "Unlimited items and collections, file and image uploads, and the AI features. Billed in rand through Paystack — cancel anytime."
            : state === "non-renewing"
              ? "Paystack can't reopen a cancelled subscription, so resubscribing starts a new one."
              : "Card updates and cancellation are handled on Paystack's secure page."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isFree ? (
          <div className="flex flex-col gap-4">
            {/* Only when the limits are real — unenforced, they'd mislead */}
            {enforced && (
              <p className="text-sm text-muted-foreground">
                {usage.items} / {FREE_LIMITS.items} items · {usage.collections}{" "}
                / {FREE_LIMITS.collections} collections
              </p>
            )}
            <UpgradeOptions usdRate={usdRate} />
          </div>
        ) : (
          <SubscriptionStatus
            state={state}
            periodEnd={periodEnd}
            paused={paused}
            usdRate={usdRate}
          />
        )}
      </CardContent>
    </Card>
  );
}
