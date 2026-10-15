export interface BillingUser {
  email: string;
  isPro: boolean;
  paystackCustomerCode: string | null;
  paystackSubscriptionCode: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
}

export interface BillingActionResult {
  success: boolean;
  /** Where to send the browser next — Paystack checkout or the manage page. */
  data?: { url: string };
  error?: string;
}
