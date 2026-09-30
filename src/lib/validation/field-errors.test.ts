import { describe, expect, it } from "vitest";
import { z } from "zod";

import { fieldErrorsFrom } from "@/lib/validation/field-errors";

const schema = z
  .object({
    email: z
      .string()
      .min(1, "Email is required")
      .regex(/@/, "Enter a valid email"),
    password: z.string().min(8, "Too short"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

function errorFor(input: unknown) {
  const parsed = schema.safeParse(input);
  if (parsed.success) throw new Error("expected a failure");
  return parsed.error;
}

describe("fieldErrorsFrom", () => {
  it("keys each message by its field", () => {
    expect(
      fieldErrorsFrom(
        errorFor({
          email: "a@b.co",
          password: "short",
          confirmPassword: "short",
        }),
      ),
    ).toEqual({ password: "Too short" });
  });

  it("keeps the first message when a field has several", () => {
    // An empty email fails both min(1) and the regex; only the first shows
    expect(
      fieldErrorsFrom(
        errorFor({
          email: "",
          password: "longenough",
          confirmPassword: "longenough",
        }),
      ),
    ).toEqual({ email: "Email is required" });
  });

  it("uses a refine's path to place its message", () => {
    expect(
      fieldErrorsFrom(
        errorFor({
          email: "a@b.co",
          password: "longenough",
          confirmPassword: "different",
        }),
      ),
    ).toEqual({ confirmPassword: "Passwords don't match" });
  });

  it("drops issues that have no field to attach to", () => {
    const error = z
      .object({ a: z.string() })
      .refine(() => false, "Whole-object problem")
      .safeParse({ a: "x" }).error;
    expect(error).toBeDefined();
    expect(fieldErrorsFrom(error!)).toEqual({});
  });
});
