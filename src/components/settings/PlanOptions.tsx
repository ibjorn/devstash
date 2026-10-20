"use client";

import { startCheckout } from "@/actions/billing";
import { PlanPrice } from "@/components/billing/PlanPrice";
import { PendingButton } from "@/components/forms/PendingButton";
import { useRedirectAction } from "@/hooks/use-redirect-action";
import { BILLING_PERIODS, type Billing } from "@/lib/billing";

interface PlanOptionsProps {
  usdRate: number | null;
  labels: Record<Billing, string>;
  pending: string | null;
  onChoose: (billing: Billing) => void;
}

/** Monthly and yearly side by side, each with its own button. */
export function PlanOptions({
  usdRate,
  labels,
  pending,
  onChoose,
}: PlanOptionsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {BILLING_PERIODS.map((billing) => (
        <div key={billing} className="flex flex-col rounded-lg border p-5">
          <p className="text-sm font-semibold capitalize">{billing}</p>
          <PlanPrice billing={billing} usdRate={usdRate} />
          <PendingButton
            pending={pending === billing}
            className="mt-auto"
            variant={billing === "yearly" ? "default" : "outline"}
            disabled={pending !== null}
            onClick={() => onChoose(billing)}
          >
            {labels[billing]}
          </PendingButton>
        </div>
      ))}
    </div>
  );
}

/** Free: either plan, through Paystack's checkout. */
export function UpgradeOptions({ usdRate }: { usdRate: number | null }) {
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
