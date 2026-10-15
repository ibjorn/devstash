import { z } from "zod";

import { formatUsd, zarToUsd } from "@/lib/exchange-rate";

export const BILLING_PERIODS = ["monthly", "yearly"] as const;
export type Billing = (typeof BILLING_PERIODS)[number];

export const billingSchema = z.enum(BILLING_PERIODS);

interface ProPlan {
  /** Whole rand — what the customer is actually charged. */
  zar: number;
  /** Paystack works in the currency subunit (cents). */
  subunit: number;
  period: string;
  /** Env var holding the Paystack plan code (PLN_…), read server-side only. */
  planCodeEnv: "PAYSTACK_PLAN_CODE_MONTHLY" | "PAYSTACK_PLAN_CODE_YEARLY";
}

// The one place Pro prices live. A South African Paystack account can only
// charge in ZAR, so rand is the source of truth and USD is display-only.
export const PRO_PLANS: Record<Billing, ProPlan> = {
  monthly: {
    zar: 135,
    subunit: 13_500,
    period: "month",
    planCodeEnv: "PAYSTACK_PLAN_CODE_MONTHLY",
  },
  yearly: {
    zar: 1_200,
    subunit: 120_000,
    period: "year",
    planCodeEnv: "PAYSTACK_PLAN_CODE_YEARLY",
  },
};

// Statuses during which the subscription still exists on Paystack. Starting a
// second checkout in any of them would leave the customer with two.
export const LIVE_SUBSCRIPTION_STATUSES = [
  "active",
  "non-renewing",
  "attention",
];

// Paystack's terminal states — the subscription is over and won't charge again.
// Its docs say "completed"; disable events have been seen carrying "complete".
const ENDED_SUBSCRIPTION_STATUSES = ["complete", "completed", "cancelled"];

export function isLiveSubscriptionStatus(status: string | null): boolean {
  return status !== null && LIVE_SUBSCRIPTION_STATUSES.includes(status);
}

interface SubscriptionLike {
  subscription_code: string;
  email_token: string;
  status: string;
  next_payment_date?: string | null;
}

/**
 * A Paystack subscription as the columns on User. Pro lasts as long as the
 * subscription does — including non-renewing (paid up until currentPeriodEnd)
 * and attention (a failed charge Paystack is still retrying).
 */
export function subscriptionState(subscription: SubscriptionLike) {
  return {
    isPro: !ENDED_SUBSCRIPTION_STATUSES.includes(subscription.status),
    paystackSubscriptionCode: subscription.subscription_code,
    paystackEmailToken: subscription.email_token,
    subscriptionStatus: subscription.status,
    currentPeriodEnd: subscription.next_payment_date
      ? new Date(subscription.next_payment_date)
      : null,
  };
}

export type BillingState =
  "free" | "pending" | "active" | "non-renewing" | "attention";

/**
 * What the settings billing section shows. "pending" is paid-for Pro whose
 * subscription hasn't synced yet, so there's nothing to manage so far.
 */
export function billingState(user: {
  isPro: boolean;
  paystackSubscriptionCode: string | null;
  subscriptionStatus: string | null;
}): BillingState {
  if (!user.isPro) return "free";
  if (!user.paystackSubscriptionCode) return "pending";
  if (
    user.subscriptionStatus === "non-renewing" ||
    user.subscriptionStatus === "attention"
  ) {
    return user.subscriptionStatus;
  }
  return "active";
}

/** Server-only: the configured plan code for a billing period. */
export function planCodeFor(billing: Billing): string {
  const code = process.env[PRO_PLANS[billing].planCodeEnv];
  if (!code) throw new Error(`${PRO_PLANS[billing].planCodeEnv} is not set`);
  return code;
}

/** Which billing period a Paystack plan code belongs to, if it's one of ours. */
export function billingForPlanCode(planCode: string): Billing | null {
  return (
    BILLING_PERIODS.find(
      (billing) => process.env[PRO_PLANS[billing].planCodeEnv] === planCode,
    ) ?? null
  );
}

/** "R135", "R1,200" — rand the way the pricing copy writes it. */
export function formatZar(zar: number): string {
  return `R${zar.toLocaleString("en-US")}`;
}

export interface ProPriceDisplay {
  amount: string;
  period: string;
  note: string;
}

/**
 * The Pro price as the pricing cards show it. With a rate the headline is an
 * approximate USD figure and the note says what's actually charged; without
 * one it falls back to rand and mentions no dollars at all.
 */
export function describeProPrice(
  billing: Billing,
  usdRate: number | null,
): ProPriceDisplay {
  const plan = PRO_PLANS[billing];
  const zar = formatZar(plan.zar);
  // With the headline in dollars, the note has to say what's really charged
  const billed = usdRate === null ? "Billed" : `Billed as ${zar}`;

  return {
    amount:
      usdRate === null ? zar : `≈ ${formatUsd(zarToUsd(plan.zar, usdRate))}`,
    period: `/ ${plan.period}`,
    note:
      billing === "monthly"
        ? `${billed} monthly. Cancel anytime.`
        : `${billed} yearly — about ${formatZar(Math.round(plan.zar / 12))} a month.`,
  };
}
