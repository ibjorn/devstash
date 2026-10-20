import type { ActionResult } from "@/types/actions";

export interface BillingUser {
  email: string;
  isPro: boolean;
  paystackCustomerCode: string | null;
  paystackSubscriptionCode: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
}

/** `data.url` is where to send the browser next — Paystack checkout or the manage page. */
export type BillingActionResult = ActionResult<{ url: string }>;
