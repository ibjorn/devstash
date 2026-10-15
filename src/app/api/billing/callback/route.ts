import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { updateBilling } from "@/lib/db/billing";
import { metadataUserId, verifyTransaction } from "@/lib/paystack";
import { syncSubscription } from "@/lib/subscription-sync";

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url));
}

function settings(request: Request, outcome: "success" | "failed") {
  return redirectTo(request, `/settings?billing=${outcome}#billing`);
}

// GET /api/billing/callback?reference=… — where Paystack sends the browser
// after checkout. The query string is the customer's to edit, so it only
// supplies a reference to look up: what was paid, and by whom, comes from
// Paystack's own record of it.
//
// Authenticates itself, as /api/items/[id] documents — the proxy matcher
// covers pages, not /api/...
export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference =
    url.searchParams.get("reference") ?? url.searchParams.get("trxref");
  if (!reference) return settings(request, "failed");

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    // Back through sign-in to this same URL, so the payment still gets applied
    const callbackUrl = `${url.pathname}${url.search}`;
    return redirectTo(
      request,
      `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`,
    );
  }

  let customerId: number;
  try {
    const transaction = await verifyTransaction(reference);

    // The userId in metadata was set by startCheckout, server-side. Checking
    // it stops a signed-in user claiming someone else's payment reference.
    if (
      transaction.status !== "success" ||
      metadataUserId(transaction.metadata) !== userId
    ) {
      return settings(request, "failed");
    }

    await updateBilling(
      { id: userId },
      { isPro: true, paystackCustomerCode: transaction.customer.customer_code },
    );
    customerId = transaction.customer.id;
  } catch (error) {
    console.error("Billing callback verification failed:", error);
    return settings(request, "failed");
  }

  // The payment is applied; the subscription details are a bonus here. If
  // Paystack hasn't created it yet, the webhook or the settings page catches up.
  try {
    await syncSubscription(userId, customerId);
  } catch (error) {
    console.error("Billing callback subscription sync failed:", error);
  }

  return settings(request, "success");
}
