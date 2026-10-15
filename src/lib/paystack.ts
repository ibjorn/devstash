import { createHmac, timingSafeEqual } from "node:crypto";

import { z } from "zod";

const PAYSTACK_API = "https://api.paystack.co";
const TIMEOUT_MS = 10_000;

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

/** Paystack answered, but said no — `status: false`, or a non-2xx. */
export class PaystackError extends Error {
  constructor(
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "PaystackError";
  }
}

const envelopeSchema = z.object({
  status: z.boolean(),
  message: z.string().optional(),
  data: z.unknown(),
});

async function paystackRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  init: { method?: "GET" | "POST"; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const envelope = envelopeSchema.safeParse(
    await response.json().catch(() => null),
  );
  if (!envelope.success || !response.ok || !envelope.data.status) {
    const message = envelope.success ? envelope.data.message : undefined;
    throw new PaystackError(
      `Paystack ${path} failed: ${message ?? "unexpected response"}`,
      response.status,
    );
  }

  return schema.parse(envelope.data.data);
}

const customerSchema = z.object({
  id: z.number(),
  customer_code: z.string(),
  email: z.string(),
});

// Plans come back as an object on most payloads but as {} or null on others
const planSchema = z
  .object({ plan_code: z.string().optional() })
  .nullish()
  .catch(null);

export const subscriptionSchema = z.object({
  subscription_code: z.string(),
  email_token: z.string(),
  status: z.string(),
  next_payment_date: z.string().nullish(),
  plan: planSchema,
  createdAt: z.string().optional(),
});
export type PaystackSubscription = z.infer<typeof subscriptionSchema>;

const transactionSchema = z.object({
  status: z.string(),
  reference: z.string(),
  customer: customerSchema,
  metadata: z.unknown(),
  plan: z.unknown().optional(),
});
export type PaystackTransaction = z.infer<typeof transactionSchema>;

interface InitializeTransactionInput {
  email: string;
  /** Subunit (cents). Paystack requires it, though the plan overrides it. */
  amount: number;
  plan: string;
  callback_url: string;
  metadata: Record<string, string>;
}

export function initializeTransaction(input: InitializeTransactionInput) {
  return paystackRequest(
    "/transaction/initialize",
    z.object({ authorization_url: z.url(), reference: z.string() }),
    {
      method: "POST",
      body: {
        ...input,
        amount: String(input.amount),
        // Paystack documents metadata as stringified JSON
        metadata: JSON.stringify(input.metadata),
      },
    },
  );
}

export function verifyTransaction(reference: string) {
  return paystackRequest(
    `/transaction/verify/${encodeURIComponent(reference)}`,
    transactionSchema,
  );
}

/** `customer` is Paystack's integer customer id, not the CUS_ code. */
export function listSubscriptions({ customer }: { customer: number }) {
  return paystackRequest(
    `/subscription?customer=${customer}`,
    z.array(subscriptionSchema),
  );
}

/** Resolves a CUS_ code to the integer id listSubscriptions filters on. */
export function fetchCustomer(customerCode: string) {
  return paystackRequest(
    `/customer/${encodeURIComponent(customerCode)}`,
    customerSchema,
  );
}

/** Hosted page where the customer updates their card or cancels. */
export async function getManageLink(subscriptionCode: string) {
  const { link } = await paystackRequest(
    `/subscription/${encodeURIComponent(subscriptionCode)}/manage/link`,
    z.object({ link: z.url() }),
  );
  return link;
}

/**
 * Pulls our userId back out of transaction metadata. We send it stringified,
 * and Paystack has been seen to return it as an object, a JSON string, or ""
 * — so this accepts any of them and trusts none.
 */
export function metadataUserId(metadata: unknown): string | null {
  let value = metadata;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  const parsed = z.object({ userId: z.string().min(1) }).safeParse(value);
  return parsed.success ? parsed.data.userId : null;
}

/**
 * Paystack signs each webhook with HMAC-SHA512 of the raw body, keyed with the
 * secret key, hex-encoded in x-paystack-signature. Must be checked against the
 * exact bytes received — re-serialising parsed JSON would not match.
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): boolean {
  if (!signature) return false;

  const expected = createHmac("sha512", secretKey()).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  // timingSafeEqual throws on a length mismatch, and a short header is just a
  // bad signature
  if (received.length !== expected.length) return false;

  return timingSafeEqual(expected, received);
}
