import { AuthError, CredentialsSignin } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { signIn, signOut } = vi.hoisted(() => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// The real module builds a NextAuth instance with the Prisma adapter, so it
// would pull the database client into a unit test.
vi.mock("@/auth", () => ({ signIn, signOut }));

import {
  signInWithCredentials,
  signInWithGitHub,
  signOutAction,
  type SignInState,
} from "@/actions/auth";
import { EmailNotVerifiedError, RateLimitedError } from "@/lib/auth/errors";

const EMPTY: SignInState = { error: null };

function formData(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const credentials = (overrides: Record<string, string> = {}) =>
  formData({
    email: "dev@devstash.io",
    password: "correct-horse",
    ...overrides,
  });

beforeEach(() => {
  vi.resetAllMocks();
});

describe("signInWithCredentials", () => {
  it("passes normalised credentials to the provider", async () => {
    await signInWithCredentials(
      EMPTY,
      credentials({ email: "  DEV@DevStash.IO " }),
    );

    expect(signIn).toHaveBeenCalledWith("credentials", {
      email: "dev@devstash.io",
      password: "correct-horse",
      redirectTo: "/dashboard",
    });
  });

  it("forwards a same-origin callbackUrl", async () => {
    await signInWithCredentials(
      EMPTY,
      credentials({ callbackUrl: "/items/notes" }),
    );

    expect(signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ redirectTo: "/items/notes" }),
    );
  });

  it("drops an off-site callbackUrl", async () => {
    await signInWithCredentials(
      EMPTY,
      credentials({ callbackUrl: "//evil.com" }),
    );

    expect(signIn).toHaveBeenCalledWith(
      "credentials",
      expect.objectContaining({ redirectTo: "/dashboard" }),
    );
  });

  it("rejects a malformed email without reaching the provider", async () => {
    const state = await signInWithCredentials(
      EMPTY,
      credentials({ email: "not-an-email" }),
    );

    expect(state.error).toBe("Enter a valid email address");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("rejects a missing password without reaching the provider", async () => {
    const state = await signInWithCredentials(
      EMPTY,
      credentials({ password: "" }),
    );

    expect(state.error).toBe("Password is required");
    expect(signIn).not.toHaveBeenCalled();
  });

  it("gives one generic message for a rejected credential", async () => {
    // Must not reveal whether the address has an account
    signIn.mockRejectedValue(new CredentialsSignin());

    const state = await signInWithCredentials(EMPTY, credentials());

    expect(state.error).toBe("Invalid email or password");
    expect(state.unverifiedEmail).toBeUndefined();
  });

  it("gives the same message for any other AuthError", async () => {
    signIn.mockRejectedValue(new AuthError("Something else went wrong"));

    const state = await signInWithCredentials(EMPTY, credentials());

    expect(state.error).toBe("Invalid email or password");
  });

  it("names the unverified address so the form can offer a resend", async () => {
    signIn.mockRejectedValue(new EmailNotVerifiedError());

    const state = await signInWithCredentials(
      EMPTY,
      credentials({ email: "  DEV@DevStash.IO " }),
    );

    expect(state.error).toContain("Verify your email address");
    expect(state.unverifiedEmail).toBe("dev@devstash.io");
  });

  it("reports how long a rate-limited caller has to wait", async () => {
    // 7 minutes — proves retryAfterSeconds survives the Auth.js boundary on
    // the thrown instance rather than falling back to the 0-second default
    signIn.mockRejectedValue(new RateLimitedError(420));

    const state = await signInWithCredentials(EMPTY, credentials());

    expect(state.error).toBe(
      "Too many attempts. Please try again in 7 minutes.",
    );
  });

  it("rethrows anything that isn't an AuthError, so NEXT_REDIRECT can bubble", async () => {
    // A successful sign-in throws a redirect; swallowing it would leave the
    // user sitting on the sign-in page
    const redirect = new Error("NEXT_REDIRECT");
    signIn.mockRejectedValue(redirect);

    await expect(signInWithCredentials(EMPTY, credentials())).rejects.toBe(
      redirect,
    );
  });
});

describe("signInWithGitHub", () => {
  it("hands off to the provider with a validated redirect", async () => {
    await signInWithGitHub(formData({ callbackUrl: "/profile" }));
    expect(signIn).toHaveBeenCalledWith("github", { redirectTo: "/profile" });
  });

  it("drops an off-site callbackUrl", async () => {
    await signInWithGitHub(formData({ callbackUrl: "https://evil.com" }));
    expect(signIn).toHaveBeenCalledWith("github", { redirectTo: "/dashboard" });
  });

  it("defaults when no callbackUrl was submitted", async () => {
    await signInWithGitHub(new FormData());
    expect(signIn).toHaveBeenCalledWith("github", { redirectTo: "/dashboard" });
  });
});

describe("signOutAction", () => {
  it("clears the session and returns to sign-in", async () => {
    await signOutAction();
    expect(signOut).toHaveBeenCalledWith({ redirectTo: "/sign-in" });
  });
});
