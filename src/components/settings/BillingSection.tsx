"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { openSubscriptionManagement, startCheckout } from "@/actions/billing";
import { PlanPrice } from "@/components/billing/PlanPrice";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BILLING_PERIODS,
  type Billing,
  type BillingState,
} from "@/lib/billing";
import type { BillingActionResult } from "@/types/billing";
import { stripSearchParam } from "@/lib/url-params";

interface BillingSectionProps {
  state: BillingState;
  /** Next payment, or when access ends — formatted on the server. */
  periodEnd: string | null;
  usdRate: number | null;
  /** ?billing= from the checkout callback, toasted once then stripped. */
  outcome?: string;
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

/**
 * Runs a billing action and follows the URL it returns off-site. The pending
 * state is deliberately left on after success, so the button can't be pressed
 * again while the browser is leaving for Paystack.
 */
function useRedirectAction() {
  const [pending, setPending] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<BillingActionResult>) {
    setPending(key);
    try {
      const result = await action();
      if (result.success && result.data) {
        window.location.assign(result.data.url);
        return;
      }
      toast.error(result.error ?? "Something went wrong. Please try again.");
    } catch {
      toast.error("Could not reach the server. Please try again.");
    }
    setPending(null);
  }

  return { pending, run };
}

const PLAN_LABELS: Record<Billing, string> = {
  monthly: "Upgrade monthly",
  yearly: "Upgrade yearly",
};

function UpgradeOptions({ usdRate }: { usdRate: number | null }) {
  const { pending, run } = useRedirectAction();

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {BILLING_PERIODS.map((billing) => (
        <div key={billing} className="flex flex-col rounded-lg border p-5">
          <p className="text-sm font-semibold capitalize">{billing}</p>
          <PlanPrice billing={billing} usdRate={usdRate} />
          <Button
            className="mt-auto"
            variant={billing === "yearly" ? "default" : "outline"}
            disabled={pending !== null}
            onClick={() => run(billing, () => startCheckout(billing))}
          >
            {pending === billing && <Loader2 className="animate-spin" />}
            {PLAN_LABELS[billing]}
          </Button>
        </div>
      ))}
    </div>
  );
}

function statusLine(state: BillingState, periodEnd: string | null) {
  switch (state) {
    case "pending":
      return "Your payment went through. We're finishing setting up your subscription — refresh in a moment to manage it.";
    case "non-renewing":
      return periodEnd
        ? `Cancelled — you keep Pro until ${periodEnd}.`
        : "Cancelled — you keep Pro until the end of this billing period.";
    default:
      return periodEnd ? `Renews on ${periodEnd}.` : "Active.";
  }
}

function SubscriptionStatus({
  state,
  periodEnd,
}: Pick<BillingSectionProps, "state" | "periodEnd">) {
  const { pending, run } = useRedirectAction();

  return (
    <div className="flex flex-col gap-4">
      {state === "attention" ? (
        <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          Your last payment failed. Paystack will retry it — update your card to
          keep Pro.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {statusLine(state, periodEnd)}
        </p>
      )}
      {state !== "pending" && (
        <Button
          variant="outline"
          className="w-fit"
          disabled={pending !== null}
          onClick={() => run("manage", openSubscriptionManagement)}
        >
          {pending && <Loader2 className="animate-spin" />}
          Manage subscription
        </Button>
      )}
    </div>
  );
}

/** Settings → Billing: upgrade options on Free, subscription status on Pro. */
export function BillingSection({
  state,
  periodEnd,
  usdRate,
  outcome,
}: BillingSectionProps) {
  // Same one-shot hand-off pattern as the sign-in page; the toast id collapses
  // Strict Mode's double-mount
  useEffect(() => {
    if (!outcome) return;
    OUTCOME_TOASTS[outcome]?.();
    stripSearchParam("billing");
  }, [outcome]);

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
            : "Card updates and cancellation are handled on Paystack's secure page."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isFree ? (
          <UpgradeOptions usdRate={usdRate} />
        ) : (
          <SubscriptionStatus state={state} periodEnd={periodEnd} />
        )}
      </CardContent>
    </Card>
  );
}
