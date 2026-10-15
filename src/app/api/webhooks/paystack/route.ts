import { NextResponse } from "next/server";
import { z } from "zod";

import { billingForPlanCode, subscriptionState } from "@/lib/billing";
import { updateBilling, type BillingUpdate } from "@/lib/db/billing";
import {
  metadataUserId,
  subscriptionSchema,
  verifyWebhookSignature,
} from "@/lib/paystack";

const eventSchema = z.object({ event: z.string(), data: z.unknown() });

const chargeSchema = z.object({
  customer: z.object({ customer_code: z.string() }),
  metadata: z.unknown(),
});

const createdSchema = subscriptionSchema.extend({
  customer: z.object({ customer_code: z.string() }),
});

// not_renew and disable payloads; email_token isn't needed to record either
const lifecycleSchema = subscriptionSchema.pick({
  subscription_code: true,
  status: true,
  next_payment_date: true,
});

const invoiceSchema = z.object({
  paid: z.boolean().optional(),
  subscription: z.object({
    subscription_code: z.string(),
    next_payment_date: z.string().nullish(),
  }),
});

function periodEnd(nextPaymentDate: string | null | undefined): BillingUpdate {
  // A non-renewing subscription has no next payment; keep the date we have
  return nextPaymentDate ? { currentPeriodEnd: new Date(nextPaymentDate) } : {};
}

async function onChargeSuccess(data: unknown) {
  const charge = chargeSchema.parse(data);
  const customerCode = charge.customer.customer_code;

  const matched = await updateBilling(
    { paystackCustomerCode: customerCode },
    { isPro: true },
  );
  if (matched > 0) return;

  // A first payment can arrive before the callback has stored the customer
  // code; startCheckout put our userId in its metadata
  const userId = metadataUserId(charge.metadata);
  if (userId) {
    await updateBilling(
      { id: userId },
      { isPro: true, paystackCustomerCode: customerCode },
    );
  }
}

async function onSubscriptionCreate(data: unknown) {
  const subscription = createdSchema.parse(data);
  const planCode = subscription.plan?.plan_code;
  if (!planCode || !billingForPlanCode(planCode)) return;

  await updateBilling(
    { paystackCustomerCode: subscription.customer.customer_code },
    subscriptionState(subscription),
  );
}

async function onSubscriptionChange(data: unknown, disabled: boolean) {
  const subscription = lifecycleSchema.parse(data);
  await updateBilling(
    { paystackSubscriptionCode: subscription.subscription_code },
    {
      subscriptionStatus: subscription.status,
      // Non-renewing stays Pro until the period runs out; Paystack sends
      // disable when it does
      isPro: !disabled,
      ...periodEnd(subscription.next_payment_date),
    },
  );
}

async function onInvoice(data: unknown, failed: boolean) {
  const invoice = invoiceSchema.parse(data);
  if (!failed && !invoice.paid) return;

  const match = {
    paystackSubscriptionCode: invoice.subscription.subscription_code,
  };
  // No dunning yet: a failed renewal is flagged, but Pro is kept while
  // Paystack retries the charge
  await updateBilling(
    match,
    failed
      ? { subscriptionStatus: "attention" }
      : {
          isPro: true,
          subscriptionStatus: "active",
          ...periodEnd(invoice.subscription.next_payment_date),
        },
  );
}

const HANDLERS: Record<string, (data: unknown) => Promise<void>> = {
  "charge.success": onChargeSuccess,
  "subscription.create": onSubscriptionCreate,
  "subscription.not_renew": (data) => onSubscriptionChange(data, false),
  "subscription.disable": (data) => onSubscriptionChange(data, true),
  "invoice.update": (data) => onInvoice(data, false),
  "invoice.payment_failed": (data) => onInvoice(data, true),
};

const ok = () => NextResponse.json({ received: true });

// POST /api/webhooks/paystack — Paystack's event feed.
//
// Public by design (the proxy matcher covers pages only) and not rate limited:
// the HMAC signature is the authentication. It's checked against the raw body
// before anything is parsed.
//
// Every handler is an absolute set keyed on a Paystack code, so retries, and
// the overlap with the callback route, are no-ops.
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (
    !verifyWebhookSignature(
      rawBody,
      request.headers.get("x-paystack-signature"),
    )
  ) {
    return NextResponse.json({ received: false }, { status: 401 });
  }

  let event: z.infer<typeof eventSchema>;
  try {
    event = eventSchema.parse(JSON.parse(rawBody));
  } catch {
    // Signed by Paystack but unreadable — a retry won't change that
    console.error("Paystack webhook: unparseable event body");
    return ok();
  }

  const handler = HANDLERS[event.event];
  if (!handler) return ok();

  try {
    await handler(event.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`Paystack webhook: unexpected ${event.event} shape`, error);
      return ok();
    }
    // Our side failed (most likely the database); a 500 makes Paystack retry,
    // which is safe because the handlers are idempotent
    console.error(`Paystack webhook: ${event.event} failed`, error);
    return NextResponse.json({ received: false }, { status: 500 });
  }

  return ok();
}
