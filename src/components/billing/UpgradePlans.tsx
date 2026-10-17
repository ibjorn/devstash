"use client";

import { Loader2 } from "lucide-react";

import { startCheckout } from "@/actions/billing";
import { FreePlanPrice } from "@/components/billing/PlanPrice";
import { PriceCard } from "@/components/billing/PriceCard";
import {
  FREE_FEATURES,
  PRO_FEATURES,
} from "@/components/billing/plan-features";
import {
  BillingToggle,
  PricingToggle,
  ProPrice,
  useBilling,
} from "@/components/homepage/PricingToggle";
import { Button } from "@/components/ui/button";
import { useRedirectAction } from "@/hooks/use-redirect-action";

const CTA = "h-9.5 w-full rounded-[10px] font-semibold";

/** Starts checkout for whichever period the toggle is on. */
function CheckoutButton() {
  const { billing } = useBilling();
  const { pending, run } = useRedirectAction();

  return (
    <Button
      className={CTA}
      disabled={pending !== null}
      onClick={() => run(billing, () => startCheckout(billing))}
    >
      {pending && <Loader2 className="animate-spin" />}
      Upgrade {billing}
    </Button>
  );
}

/** /upgrade: Free vs Pro with the billing toggle, and checkout from the Pro card. */
export function UpgradePlans({ usdRate }: { usdRate: number | null }) {
  return (
    <PricingToggle>
      <BillingToggle />
      <div className="grid justify-center gap-6 md:grid-cols-[repeat(2,minmax(0,380px))]">
        <PriceCard
          name="Free"
          price={<FreePlanPrice />}
          features={FREE_FEATURES}
        >
          <Button variant="outline" className={CTA} disabled>
            Current plan
          </Button>
        </PriceCard>
        <PriceCard
          name="Pro"
          price={<ProPrice usdRate={usdRate} />}
          features={PRO_FEATURES}
          featured
        >
          <CheckoutButton />
        </PriceCard>
      </div>
      <p className="mt-6 text-center text-xs text-muted-foreground">
        You&apos;ll pay on Paystack&apos;s secure checkout and come back to
        Settings once it&apos;s done.
      </p>
    </PricingToggle>
  );
}
