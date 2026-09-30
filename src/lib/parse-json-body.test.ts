import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseJsonBody } from "@/lib/parse-json-body";

const schema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email")),
});

function jsonRequest(body: string) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

describe("parseJsonBody", () => {
  it("returns the schema's output for a valid body", async () => {
    const result = await parseJsonBody(
      jsonRequest(JSON.stringify({ email: "  A@B.com " })),
      schema,
      { invalid: "Invalid" },
    );
    expect(result).toEqual({ data: { email: "a@b.com" } });
  });

  it("400s malformed JSON with the default message", async () => {
    const result = await parseJsonBody(jsonRequest("{nope"), schema, {
      invalid: "Invalid",
    });
    expect(result.response?.status).toBe(400);
    expect(await result.response?.json()).toEqual({
      success: false,
      error: "Request body must be valid JSON",
    });
  });

  it("uses the caller's invalid-JSON message when given", async () => {
    const result = await parseJsonBody(jsonRequest("{nope"), schema, {
      invalid: "Invalid",
      invalidJson: "Invalid request body",
    });
    expect(await result.response?.json()).toEqual({
      success: false,
      error: "Invalid request body",
    });
  });

  it("400s a schema failure with its first issue message", async () => {
    const result = await parseJsonBody(
      jsonRequest(JSON.stringify({ email: "not-an-email" })),
      schema,
      { invalid: "Invalid" },
    );
    expect(result.response?.status).toBe(400);
    expect(await result.response?.json()).toEqual({
      success: false,
      error: "Enter a valid email",
    });
  });
});
