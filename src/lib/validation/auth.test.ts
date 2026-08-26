import { describe, expect, it } from "vitest";

import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  registerSchema,
  resetPasswordSchema,
  signInSchema,
} from "@/lib/validation/auth";

const firstIssue = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues[0]?.message;

const validRegistration = {
  name: "Björn",
  email: "dev@devstash.io",
  password: "correct-horse",
  confirmPassword: "correct-horse",
};

describe("email normalisation", () => {
  it("trims and lowercases before validating", () => {
    const result = forgotPasswordSchema.safeParse({
      email: "  DEV@DevStash.IO  ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("dev@devstash.io");
  });

  it("rejects a malformed address", () => {
    const result = forgotPasswordSchema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Enter a valid email address");
  });

  it("rejects a colon, keeping addresses disjoint from reset identifiers", () => {
    // src/lib/auth/reset-token.ts namespaces reset tokens as
    // "password-reset:<email>" and relies on no real address containing a colon
    expect(
      forgotPasswordSchema.safeParse({ email: "password-reset:a@b.com" })
        .success,
    ).toBe(false);
  });
});

describe("new-password rules", () => {
  it("accepts a normal password", () => {
    expect(registerSchema.safeParse(validRegistration).success).toBe(true);
  });

  it("rejects anything under 8 characters", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      password: "short",
      confirmPassword: "short",
    });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Password must be at least 8 characters");
  });

  it("accepts exactly 72 ASCII characters and rejects 73", () => {
    // bcrypt hashes only the first 72 bytes, so a longer password would be
    // silently truncated and collide with its own prefix
    const at = "a".repeat(72);
    const over = "a".repeat(73);
    expect(
      registerSchema.safeParse({
        ...validRegistration,
        password: at,
        confirmPassword: at,
      }).success,
    ).toBe(true);

    const result = registerSchema.safeParse({
      ...validRegistration,
      password: over,
      confirmPassword: over,
    });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Password must be at most 72 characters");
  });

  it("counts bytes, not characters, for multi-byte passwords", () => {
    // 24 emoji is only 48 UTF-16 code units — under a .max(72) character cap —
    // but 96 bytes, which is where the byte refine has to catch it
    const emoji = "😀".repeat(24);
    expect(emoji.length).toBeLessThanOrEqual(72);
    expect(new TextEncoder().encode(emoji).length).toBe(96);

    const result = registerSchema.safeParse({
      ...validRegistration,
      password: emoji,
      confirmPassword: emoji,
    });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toContain("too long");
  });

  it("accepts multi-byte passwords that fit in 72 bytes", () => {
    const emoji = "😀".repeat(18);
    expect(new TextEncoder().encode(emoji).length).toBe(72);
    expect(
      registerSchema.safeParse({
        ...validRegistration,
        password: emoji,
        confirmPassword: emoji,
      }).success,
    ).toBe(true);
  });

  it("rejects a confirmation that doesn't match", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      confirmPassword: "something-else",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
    expect(firstIssue(result)).toBe("Passwords do not match");
  });

  it("requires a name", () => {
    const result = registerSchema.safeParse({
      ...validRegistration,
      name: "   ",
    });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Name is required");
  });
});

describe("signInSchema", () => {
  it("still accepts a password set before the 72-byte cap existed", () => {
    // bcrypt truncates their input to the same 72 bytes it hashed, so it
    // matches — rejecting at 72 here would lock them out for no gain
    const result = signInSchema.safeParse({
      email: "dev@devstash.io",
      password: "a".repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it("still bounds the field, to keep an unbounded body out of bcrypt", () => {
    const result = signInSchema.safeParse({
      email: "dev@devstash.io",
      password: "a".repeat(1025),
    });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Password is too long");
  });

  it("requires a password", () => {
    const result = signInSchema.safeParse({
      email: "dev@devstash.io",
      password: "",
    });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Password is required");
  });
});

describe("resetPasswordSchema", () => {
  const valid = {
    token: "raw-token",
    password: "correct-horse",
    confirmPassword: "correct-horse",
  };

  it("accepts a complete payload", () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("reports a missing token in words a user can read", () => {
    const result = resetPasswordSchema.safeParse({
      ...valid,
      token: undefined,
    });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Reset link is missing its token");
  });

  it("reports an empty token the same way", () => {
    const result = resetPasswordSchema.safeParse({ ...valid, token: "" });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Reset link is missing its token");
  });
});

describe("changePasswordSchema", () => {
  const valid = {
    currentPassword: "old-password",
    password: "new-password",
    confirmPassword: "new-password",
  };

  it("accepts a complete payload", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("requires the current password", () => {
    const result = changePasswordSchema.safeParse({
      ...valid,
      currentPassword: "",
    });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Enter your current password");
  });

  it("refuses a new password identical to the current one", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "same-password",
      password: "same-password",
      confirmPassword: "same-password",
    });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe(
      "New password must be different from your current one",
    );
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
  });
});

describe("deleteAccountSchema", () => {
  it("normalises the typed confirmation", () => {
    const result = deleteAccountSchema.safeParse({
      confirmEmail: "  DEV@DevStash.IO ",
    });
    expect(result.success).toBe(true);
    expect(result.data?.confirmEmail).toBe("dev@devstash.io");
  });

  it("requires a value", () => {
    const result = deleteAccountSchema.safeParse({ confirmEmail: "" });
    expect(result.success).toBe(false);
    expect(firstIssue(result)).toBe("Type your email address to confirm");
  });

  it("does not second-guess the shape of what was typed", () => {
    // Its only job is to equal the account's address; a single "that doesn't
    // match" from the action reads better than Zod calling it an invalid email
    expect(deleteAccountSchema.safeParse({ confirmEmail: "nonsense" }).success)
      .toBe(true);
  });
});
