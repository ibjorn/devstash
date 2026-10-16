"use server";

import { billingSchema, planCodeFor, PRO_PLANS } from "@/lib/billing";
import { getBillingUser } from "@/lib/db/billing";
import { getSessionUserId } from "@/lib/db/session-user";
import { getAppUrl } from "@/lib/email/app-url";
import { hasProAccess } from "@/lib/entitlements";
import { getManageLink, initializeTransaction } from "@/lib/paystack";
import type { BillingActionResult } from "@/types/billing";

const SIGNED_OUT = "You need to be signed in to manage billing.";
const FAILED_RENEWAL =
  "Your last payment failed. Update your card under Manage subscription instead of starting a new one.";

/**
 * Starts a Paystack checkout for a Pro plan and hands back the hosted checkout
 * URL for the browser to follow. Nothing is granted here — Pro is only set
 * once the callback route or webhook has verified the payment with Paystack.
 */
export async function startCheckout(
  billing: unknown,
): Promise<BillingActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: SIGNED_OUT };

  const parsed = billingSchema.safeParse(billing);
  if (!parsed.success) {
    return { success: false, error: "Choose monthly or yearly billing." };
  }

  try {
    const user = await getBillingUser(userId);
    if (!user) return { success: false, error: SIGNED_OUT };

    // Paystack may still retry a failed renewal, even past the grace, so a
    // second subscription could charge the customer twice
    if (user.subscriptionStatus === "attention") {
      return { success: false, error: FAILED_RENEWAL };
    }
    // Still Pro — including the moment after paying, before the subscription
    // syncs, and a cancelled period that hasn't run out yet. An active
    // subscription can still charge whatever isPro says. Only an expired
    // non-renewing one is safe to replace.
    if (hasProAccess(user) || user.subscriptionStatus === "active") {
      return { success: false, error: "You already have a Pro subscription." };
    }

    const { authorization_url } = await initializeTransaction({
      email: user.email,
      amount: PRO_PLANS[parsed.data].subunit,
      plan: planCodeFor(parsed.data),
      callback_url: `${getAppUrl()}/api/billing/callback`,
      metadata: { userId },
    });
    return { success: true, data: { url: authorization_url } };
  } catch (error) {
    console.error("startCheckout failed", error);
    return {
      success: false,
      error: "Checkout is unavailable right now. Please try again.",
    };
  }
}

/**
 * Paystack's hosted page for the session user's subscription, where they
 * update their card or cancel. The link is short-lived, so it's fetched on
 * click rather than rendered into the page.
 */
export async function openSubscriptionManagement(): Promise<BillingActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: SIGNED_OUT };

  try {
    const user = await getBillingUser(userId);
    if (!user?.paystackSubscriptionCode) {
      return { success: false, error: "There's no subscription to manage." };
    }

    const url = await getManageLink(user.paystackSubscriptionCode);
    return { success: true, data: { url } };
  } catch (error) {
    console.error("openSubscriptionManagement failed", error);
    return {
      success: false,
      error: "Could not open subscription management. Please try again.",
    };
  }
}
