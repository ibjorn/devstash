import {
  billingForPlanCode,
  isLiveSubscriptionStatus,
  subscriptionState,
} from "@/lib/billing";
import { updateBilling } from "@/lib/db/billing";
import type { BillingUser } from "@/types/billing";
import {
  fetchCustomer,
  fetchSubscription,
  listSubscriptions,
  type PaystackSubscription,
} from "@/lib/paystack";

// Newest first; Paystack's list order isn't documented
function newest(a: PaystackSubscription, b: PaystackSubscription) {
  return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
}

/**
 * Pulls the customer's Pro subscription from Paystack and stores it — the
 * same state the subscription.create webhook would write. This is what lets
 * checkout work without a webhook reaching the app (local dev has no public
 * URL). Returns false when Paystack hasn't created the subscription yet.
 */
export async function syncSubscription(
  userId: string,
  customerId: number,
): Promise<boolean> {
  const subscriptions = await listSubscriptions({ customer: customerId });

  // Live ones only. Straight after checkout Paystack may not have created the
  // new subscription yet, and an older cancelled one must not be mistaken for
  // it — that would revoke the Pro the payment just granted. Endings arrive
  // through the subscription.disable webhook instead.
  const [subscription] = subscriptions
    .filter(
      (sub) =>
        isLiveSubscriptionStatus(sub.status) &&
        sub.plan?.plan_code &&
        billingForPlanCode(sub.plan.plan_code),
    )
    .sort(newest);
  if (!subscription) return false;

  await updateBilling({ id: userId }, subscriptionState(subscription));
  return true;
}

/**
 * For a user who has paid (customer code stored) but whose subscription never
 * synced — the callback beat Paystack to creating it, and no webhook reached
 * us. Fails soft: the settings page renders either way.
 */
export async function syncPendingSubscription(
  userId: string,
  customerCode: string,
): Promise<boolean> {
  try {
    const customer = await fetchCustomer(customerCode);
    return await syncSubscription(userId, customer.id);
  } catch (error) {
    console.error("Pending subscription sync failed:", error);
    return false;
  }
}

/**
 * Re-reads the user's stored subscription from Paystack and records any
 * change — a cancellation whose webhook never reached us (local dev has no
 * public URL, and production can miss a delivery). Matched on the code, so it
 * can't overwrite a newer subscription. Fails soft; true when it wrote.
 */
export async function refreshSubscription(
  user: Pick<
    BillingUser,
    "paystackSubscriptionCode" | "subscriptionStatus" | "currentPeriodEnd"
  >,
): Promise<boolean> {
  const code = user.paystackSubscriptionCode;
  if (!code) return false;

  try {
    const state = subscriptionState(await fetchSubscription(code));
    if (
      state.subscriptionStatus === user.subscriptionStatus &&
      state.currentPeriodEnd?.getTime() === user.currentPeriodEnd?.getTime()
    ) {
      return false;
    }
    await updateBilling({ paystackSubscriptionCode: code }, state);
    return true;
  } catch (error) {
    console.error("Subscription refresh failed:", error);
    return false;
  }
}
