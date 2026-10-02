"use client";

import { createContext, useContext, useState } from "react";

import { cn } from "@/lib/utils";

type Billing = "monthly" | "yearly";

const PRO_PRICES: Record<
  Billing,
  { amount: string; period: string; note: string }
> = {
  monthly: {
    amount: "$8",
    period: "/ month",
    note: "Billed monthly. Cancel anytime.",
  },
  yearly: {
    amount: "$72",
    period: "/ year",
    note: "Just $6 a month, billed yearly.",
  },
};

const BillingContext = createContext<{
  billing: Billing;
  setBilling: (billing: Billing) => void;
} | null>(null);

function useBilling() {
  const context = useContext(BillingContext);
  if (!context) throw new Error("useBilling must be used inside PricingToggle");
  return context;
}

/**
 * Holds the billing period for the pricing section. The toggle and the Pro
 * price sit in different parts of the server-rendered section, so they share
 * the state through context rather than living in one component.
 */
export function PricingToggle({ children }: { children: React.ReactNode }) {
  const [billing, setBilling] = useState<Billing>("monthly");
  return (
    <BillingContext.Provider value={{ billing, setBilling }}>
      {children}
    </BillingContext.Provider>
  );
}

const OPTIONS: { value: Billing; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

export function BillingToggle() {
  const { billing, setBilling } = useBilling();
  return (
    <div
      role="group"
      aria-label="Billing period"
      className="mx-auto mb-10 flex w-fit rounded-full border bg-card p-1"
    >
      {OPTIONS.map(({ value, label }) => {
        const active = billing === value;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            onClick={() => setBilling(value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4.5 py-2 text-[0.88rem] font-semibold transition-colors",
              active
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
            {value === "yearly" && (
              <span
                className={cn(
                  "rounded-full px-1.75 py-0.5 text-[0.7rem]",
                  active
                    ? "bg-emerald-500/20 text-emerald-700"
                    : "bg-emerald-500/18 text-emerald-400",
                )}
              >
                Save 25%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** The Pro card's amount, period and billing note for the chosen period. */
export function ProPrice() {
  const price = PRO_PRICES[useBilling().billing];
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
