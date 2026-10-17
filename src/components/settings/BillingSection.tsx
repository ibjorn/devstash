"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  openSubscriptionManagement,
  resubscribe,
  startCheckout,
} from "@/actions/billing";
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
import { useRedirectAction } from "@/hooks/use-redirect-action";
import { FREE_LIMITS } from "@/lib/entitlements";
import { stripSearchParam } from "@/lib/url-params";

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

interface PlanOptionsProps {
  usdRate: number | null;
  labels: Record<Billing, string>;
  pending: string | null;
  onChoose: (billing: Billing) => void;
}

function PlanOptions({ usdRate, labels, pending, onChoose }: PlanOptionsProps) {
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
            onClick={() => onChoose(billing)}
          >
            {pending === billing && <Loader2 className="animate-spin" />}
            {labels[billing]}
          </Button>
        </div>
      ))}
    </div>
  );
}

function UpgradeOptions({ usdRate }: { usdRate: number | null }) {
  const { pending, run } = useRedirectAction();

  return (
    <PlanOptions
      usdRate={usdRate}
      labels={{ monthly: "Upgrade monthly", yearly: "Upgrade yearly" }}
      pending={pending}
      onChoose={(billing) => run(billing, () => startCheckout(billing))}
    />
  );
}

/**
 * Cancelled but still paid up: a new subscription on the saved card, starting
 * when this period ends. Stays on the page — there's no checkout to visit.
 */
function ResubscribeOptions({
  usdRate,
  periodEnd,
}: {
  usdRate: number | null;
  periodEnd: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Billing | null>(null);

  async function choose(billing: Billing) {
    setPending(billing);
    try {
      const result = await resubscribe(billing);
      if (result.success) {
        toast.success(
          periodEnd
            ? `You're resubscribed — the first charge is on ${periodEnd}.`
            : "You're resubscribed.",
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      toast.error("Could not reach the server. Please try again.");
    }
    setPending(null);
  }

  return (
    <PlanOptions
      usdRate={usdRate}
      labels={{ monthly: "Resubscribe monthly", yearly: "Resubscribe yearly" }}
      pending={pending}
      onChoose={choose}
    />
  );
}

function statusLine(state: BillingState, periodEnd: string | null) {
  switch (state) {
    case "pending":
      return "Your payment went through. We're finishing setting up your subscription — refresh in a moment to manage it.";
    // Generic on the plan: User doesn't store which one is active
    case "non-renewing":
      return periodEnd
        ? `Cancelled — you keep Pro until ${periodEnd} and won't be charged again. To carry on, resubscribe on either plan: nothing is charged before ${periodEnd}, and it uses the card you paid with.`
        : "Cancelled — you keep Pro until the end of this billing period and won't be charged again. To carry on, resubscribe on either plan: nothing is charged before then, and it uses the card you paid with.";
    default:
      return periodEnd ? `Renews on ${periodEnd}.` : "Active.";
  }
}

function SubscriptionStatus({
  state,
  periodEnd,
  paused,
  usdRate,
}: Pick<BillingSectionProps, "state" | "periodEnd" | "paused" | "usdRate">) {
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
          {statusLine(state, periodEnd)}
        </p>
      )}
      {state === "non-renewing" && (
        <ResubscribeOptions usdRate={usdRate} periodEnd={periodEnd} />
      )}
      {/* Paystack's page has nothing to offer a cancelled subscription */}
      {state !== "pending" && state !== "non-renewing" && (
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
  enforced,
  usage,
  paused,
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
