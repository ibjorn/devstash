"use client";

import { AlertTriangle } from "lucide-react";

import { openSubscriptionManagement } from "@/actions/billing";
import { PendingButton } from "@/components/forms/PendingButton";
import { ResubscribeOptions } from "@/components/settings/ResubscribeOptions";
import { useRedirectAction } from "@/hooks/use-redirect-action";
import { billingStatusLine, type BillingState } from "@/lib/billing";

interface SubscriptionStatusProps {
  state: BillingState;
  periodEnd: string | null;
  /** A failed renewal has run past its grace period and Pro is off. */
  paused: boolean;
  usdRate: number | null;
}

/** Pro: where the subscription stands, and what can be done about it. */
export function SubscriptionStatus({
  state,
  periodEnd,
  paused,
  usdRate,
}: SubscriptionStatusProps) {
  const { pending, run } = useRedirectAction();

  return (
    <div className="flex flex-col gap-4">
      {state === "attention" ? (
        <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <span>
            Your last payment failed. Paystack will retry it — update your card
            to keep Pro.
            {paused &&
              " Pro features are paused until the payment goes through."}
          </span>
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {billingStatusLine(state, periodEnd)}
        </p>
      )}
      {state === "non-renewing" && (
        <ResubscribeOptions usdRate={usdRate} periodEnd={periodEnd} />
      )}
      {/* Paystack's page has nothing to offer a cancelled subscription */}
      {state !== "pending" && state !== "non-renewing" && (
        <PendingButton
          pending={pending !== null}
          variant="outline"
          className="w-fit"
          onClick={() => run("manage", openSubscriptionManagement)}
        >
          Manage subscription
        </PendingButton>
      )}
    </div>
  );
}
