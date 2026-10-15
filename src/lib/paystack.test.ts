import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  metadataUserId,
  PaystackError,
  verifyTransaction,
  verifyWebhookSignature,
} from "@/lib/paystack";

const SECRET = "sk_test_secret";
const body = JSON.stringify({ event: "charge.success", data: { id: 1 } });

function sign(payload: string, key = SECRET) {
  return createHmac("sha512", key).update(payload).digest("hex");
}

beforeEach(() => {
  vi.stubEnv("PAYSTACK_SECRET_KEY", SECRET);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("verifyWebhookSignature", () => {
  it("accepts Paystack's HMAC-SHA512 of the raw body", () => {
    expect(verifyWebhookSignature(body, sign(body))).toBe(true);
  });

  it("rejects a tampered body", () => {
    const tampered = body.replace('"id":1', '"id":2');
    expect(verifyWebhookSignature(tampered, sign(body))).toBe(false);
  });

  it("rejects a signature made with another key", () => {
    expect(verifyWebhookSignature(body, sign(body, "sk_test_other"))).toBe(
      false,
    );
  });

  it("rejects a wrong-length or non-hex signature without throwing", () => {
    expect(verifyWebhookSignature(body, sign(body).slice(0, 64))).toBe(false);
    expect(verifyWebhookSignature(body, "zz".repeat(64))).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(verifyWebhookSignature(body, null)).toBe(false);
    expect(verifyWebhookSignature(body, "")).toBe(false);
  });
});

describe("metadataUserId", () => {
  it("reads the userId from an object or a JSON string", () => {
    expect(metadataUserId({ userId: "usr_1" })).toBe("usr_1");
    expect(metadataUserId('{"userId":"usr_1"}')).toBe("usr_1");
  });

  it("returns null for anything else", () => {
    for (const value of ["", "not json", null, undefined, {}, { userId: 7 }]) {
      expect(metadataUserId(value)).toBeNull();
    }
  });
});

describe("paystackRequest", () => {
  it("throws a PaystackError when Paystack answers status: false", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ status: false, message: "Transaction not found" }),
            { status: 400 },
          ),
        ),
    );

    await expect(verifyTransaction("ref_1")).rejects.toBeInstanceOf(
      PaystackError,
    );
  });

  it("sends the secret key as a bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: true,
          data: {
            status: "success",
            reference: "ref_1",
            customer: { id: 7, customer_code: "CUS_1", email: "a@b.co" },
            metadata: "",
          },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await verifyTransaction("ref_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.paystack.co/transaction/verify/ref_1",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${SECRET}`,
        }),
      }),
    );
  });
});
