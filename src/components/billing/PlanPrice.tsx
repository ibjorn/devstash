import { describeProPrice, type Billing } from "@/lib/billing";

interface PlanPriceProps {
  billing: Billing;
  usdRate: number | null;
}

/**
 * The Pro amount, period and billing note — approximate USD with the rand it's
 * billed as, or rand alone without a rate. Shared by the homepage pricing card
 * and the settings billing section.
 */
export function PlanPrice({ billing, usdRate }: PlanPriceProps) {
  const price = describeProPrice(billing, usdRate);
  return (
    <>
      <p className="mt-4 mb-2 flex items-baseline gap-2">
        <span className="text-[2.8rem] font-extrabold tracking-[-0.03em]">
          {price.amount}
        </span>
        <span className="text-muted-foreground">{price.period}</span>
      </p>
      <p className="mb-6 min-h-[1.6em] text-[0.92rem] text-muted-foreground">
        {price.note}
      </p>
    </>
  );
}

/** The Free plan's price block, laid out like the Pro one beside it. */
export function FreePlanPrice() {
  return (
    <>
      <p className="mt-4 mb-2 flex items-baseline gap-2">
        <span className="text-[2.8rem] font-extrabold tracking-[-0.03em]">
          $0
        </span>
        <span className="text-muted-foreground">forever</span>
      </p>
      <p className="mb-6 min-h-[1.6em] text-[0.92rem] text-muted-foreground">
        Everything you need to get your stash started.
      </p>
    </>
  );
}
