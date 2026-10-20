import bcrypt from "bcryptjs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const {
  signOut,
  prisma,
  getSessionUserId,
  checkRateLimit,
  clearRateLimit,
  deleteObjectsWithPrefix,
  disableSubscription,
} = vi.hoisted(() => ({
  signOut: vi.fn(),
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
  getSessionUserId: vi.fn(),
  checkRateLimit: vi.fn(),
  clearRateLimit: vi.fn(),
  deleteObjectsWithPrefix: vi.fn(),
  disableSubscription: vi.fn(),
}));

vi.mock("@/auth", () => ({ signOut }));
vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("@/lib/db/session-user", () => ({ getSessionUserId }));
vi.mock("@/lib/r2", () => ({ deleteObjectsWithPrefix }));
vi.mock("@/lib/paystack", () => ({ disableSubscription }));
// Partial: the limiter itself is stubbed, but rateLimitMessage stays real so
// the copy a user would actually see is what gets asserted.
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  checkRateLimit,
  clearRateLimit,
}));

import { changePassword, deleteAccount } from "@/actions/profile";
import { BCRYPT_ROUNDS } from "@/lib/auth/password";
import { formData } from "@/test/form-data";

const USER_ID = "usr_1";
const EMAIL = "dev@devstash.io";
const CURRENT_PASSWORD = "current-password";
const NEW_PASSWORD = "brand-new-password";

let currentHash: string;

/** A transaction client that records the order its deletes were issued in. */
function transactionClient() {
  return {
    item: { deleteMany: vi.fn() },
    collection: { deleteMany: vi.fn() },
    itemType: { deleteMany: vi.fn() },
    account: { deleteMany: vi.fn() },
    session: { deleteMany: vi.fn() },
    verificationToken: { deleteMany: vi.fn() },
    user: { delete: vi.fn() },
  };
}

const changeForm = (overrides: Record<string, string> = {}) =>
  formData({
    currentPassword: CURRENT_PASSWORD,
    password: NEW_PASSWORD,
    confirmPassword: NEW_PASSWORD,
    ...overrides,
  });

const allowed = {
  success: true,
  remaining: 4,
  reset: 0,
  retryAfterSeconds: 0,
};

beforeAll(async () => {
  currentHash = await bcrypt.hash(CURRENT_PASSWORD, BCRYPT_ROUNDS);
});

beforeEach(() => {
  vi.resetAllMocks();
  getSessionUserId.mockResolvedValue(USER_ID);
  checkRateLimit.mockResolvedValue(allowed);
  clearRateLimit.mockResolvedValue(undefined);
});

describe("changePassword", () => {
  it("refuses a caller with no session without logging a failure", async () => {
    getSessionUserId.mockResolvedValue(null);
    const consoleError = vi.spyOn(console, "error");

    const result = await changePassword(changeForm());

    expect(result).toEqual({
      success: false,
      error: "You need to be signed in to change your password.",
    });
    expect(checkRateLimit).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("returns field errors without touching the database", async () => {
    const result = await changePassword(
      changeForm({ confirmPassword: "does-not-match" }),
    );

    expect(result).toEqual({
      success: false,
      fieldErrors: { confirmPassword: "Passwords do not match" },
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("keeps only the first error per field", async () => {
    const result = await changePassword(
      changeForm({ currentPassword: "", password: "x", confirmPassword: "x" }),
    );

    expect(result.fieldErrors?.currentPassword).toBe(
      "Enter your current password",
    );
    expect(result.fieldErrors?.password).toBe(
      "Password must be at least 8 characters",
    );
  });

  it("stops on the rate limit before reading the stored hash", async () => {
    checkRateLimit.mockResolvedValue({
      success: false,
      remaining: 0,
      reset: Date.now() + 600_000,
      retryAfterSeconds: 600,
    });

    const result = await changePassword(changeForm());

    expect(result).toEqual({
      success: false,
      error: "Too many attempts. Please try again in 10 minutes.",
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("keys the limit by user id, not IP", async () => {
    prisma.user.findUnique.mockResolvedValue({ password: currentHash });

    await changePassword(changeForm());

    expect(checkRateLimit).toHaveBeenCalledWith("changePassword", USER_ID);
  });

  it("refuses an account that has no password to change", async () => {
    prisma.user.findUnique.mockResolvedValue({ password: null });

    const result = await changePassword(changeForm());

    expect(result.success).toBe(false);
    expect(result.error).toContain("signs in with GitHub");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("rejects a wrong current password against the stored hash", async () => {
    prisma.user.findUnique.mockResolvedValue({ password: currentHash });

    const result = await changePassword(
      changeForm({ currentPassword: "not-the-current-password" }),
    );

    expect(result).toEqual({
      success: false,
      fieldErrors: { currentPassword: "That password is incorrect" },
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
    // A failed guess stays on the clock
    expect(clearRateLimit).not.toHaveBeenCalled();
  });

  it("writes a hash of the new password that actually verifies", async () => {
    prisma.user.findUnique.mockResolvedValue({ password: currentHash });

    const result = await changePassword(changeForm());

    expect(result).toEqual({ success: true });

    const data = prisma.user.update.mock.calls[0]?.[0];
    expect(data.where).toEqual({ id: USER_ID });
    expect(data.data.password).not.toBe(NEW_PASSWORD);
    await expect(
      bcrypt.compare(NEW_PASSWORD, data.data.password),
    ).resolves.toBe(true);
    await expect(
      bcrypt.compare(CURRENT_PASSWORD, data.data.password),
    ).resolves.toBe(false);
  });

  it("clears the attempt budget once the correct password is given", async () => {
    prisma.user.findUnique.mockResolvedValue({ password: currentHash });

    await changePassword(changeForm());

    expect(clearRateLimit).toHaveBeenCalledWith("changePassword", USER_ID);
  });

  it("reports a database failure without leaking it", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    prisma.user.findUnique.mockRejectedValue(new Error("connection refused"));

    const result = await changePassword(changeForm());

    expect(result).toEqual({
      success: false,
      error: "Could not update your password",
    });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("deleteAccount", () => {
  const deleteForm = (confirmEmail: string) => formData({ confirmEmail });

  function withTransaction() {
    const tx = transactionClient();
    prisma.$transaction.mockImplementation(async (run) => run(tx));
    return tx;
  }

  it("refuses a caller with no session without touching anything", async () => {
    getSessionUserId.mockResolvedValue(null);
    const consoleError = vi.spyOn(console, "error");

    const result = await deleteAccount(deleteForm(EMAIL));

    expect(result).toEqual({
      success: false,
      error: "You need to be signed in to delete your account.",
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("requires a typed confirmation", async () => {
    const result = await deleteAccount(deleteForm(""));

    expect(result.fieldErrors?.confirmEmail).toBe(
      "Type your email address to confirm",
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("re-checks the typed email on the server", async () => {
    // The dialog only enables its button on a match, but a client guard is
    // not a control
    prisma.user.findUnique.mockResolvedValue({ email: EMAIL });

    const result = await deleteAccount(deleteForm("someone.else@devstash.io"));

    expect(result).toEqual({
      success: false,
      fieldErrors: { confirmEmail: "That doesn't match your email address" },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("accepts the address padded and in the wrong case", async () => {
    prisma.user.findUnique.mockResolvedValue({ email: EMAIL });
    withTransaction();

    await deleteAccount(deleteForm("  DEV@DevStash.IO  "));

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("deletes dependants before the user, in Item → Collection → ItemType order", async () => {
    // Not the User cascade: Item.itemTypeId is ON DELETE RESTRICT, so a user
    // holding custom item types with items attached can make it fail
    prisma.user.findUnique.mockResolvedValue({ email: EMAIL });
    const tx = withTransaction();

    await deleteAccount(deleteForm(EMAIL));

    const order = [
      tx.item.deleteMany,
      tx.collection.deleteMany,
      tx.itemType.deleteMany,
      tx.account.deleteMany,
      tx.session.deleteMany,
      tx.verificationToken.deleteMany,
      tx.user.delete,
    ].map((fn) => {
      expect(fn).toHaveBeenCalledTimes(1);
      return fn.mock.invocationCallOrder[0];
    });

    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(tx.user.delete).toHaveBeenCalledWith({ where: { id: USER_ID } });
  });

  it("clears both kinds of token for the address", async () => {
    // Verification tokens sit under the bare address, reset tokens under the
    // namespaced one, and neither has a relation to User to cascade from
    prisma.user.findUnique.mockResolvedValue({ email: EMAIL });
    const tx = withTransaction();

    await deleteAccount(deleteForm(EMAIL));

    expect(tx.verificationToken.deleteMany).toHaveBeenCalledWith({
      where: { identifier: { in: [EMAIL, `password-reset:${EMAIL}`] } },
    });
  });

  it("only ever deletes the caller's own custom item types", async () => {
    prisma.user.findUnique.mockResolvedValue({ email: EMAIL });
    const tx = withTransaction();

    await deleteAccount(deleteForm(EMAIL));

    // userId is null on system types, so this filter can't reach them
    expect(tx.itemType.deleteMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  it("signs the user out afterwards, since the JWT would outlive the row", async () => {
    prisma.user.findUnique.mockResolvedValue({ email: EMAIL });
    withTransaction();

    await deleteAccount(deleteForm(EMAIL));

    expect(signOut).toHaveBeenCalledWith({
      redirectTo: "/sign-in?deleted=1",
    });
  });

  it("removes every R2 object under the user's prefix after the rows are gone", async () => {
    prisma.user.findUnique.mockResolvedValue({ email: EMAIL });
    const tx = withTransaction();

    await deleteAccount(deleteForm(EMAIL));

    expect(deleteObjectsWithPrefix).toHaveBeenCalledWith(`${USER_ID}/`);
    expect(deleteObjectsWithPrefix.mock.invocationCallOrder[0]).toBeGreaterThan(
      tx.user.delete.mock.invocationCallOrder[0],
    );
  });

  it("still signs out when the R2 cleanup fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    prisma.user.findUnique.mockResolvedValue({ email: EMAIL });
    withTransaction();
    deleteObjectsWithPrefix.mockRejectedValue(new Error("R2 down"));

    await deleteAccount(deleteForm(EMAIL));

    expect(signOut).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("lets the sign-out redirect bubble rather than catching it as a failure", async () => {
    prisma.user.findUnique.mockResolvedValue({ email: EMAIL });
    withTransaction();
    const redirect = new Error("NEXT_REDIRECT");
    signOut.mockRejectedValue(redirect);

    await expect(deleteAccount(deleteForm(EMAIL))).rejects.toBe(redirect);
  });

  describe("with a Paystack subscription", () => {
    const subscribed = (subscriptionStatus: string | null) => ({
      email: EMAIL,
      paystackSubscriptionCode: "SUB_123",
      paystackEmailToken: "tok_456",
      subscriptionStatus,
    });

    it.each(["active", "attention"])(
      "cancels a %s subscription before deleting anything",
      async (status) => {
        prisma.user.findUnique.mockResolvedValue(subscribed(status));
        const tx = withTransaction();

        await deleteAccount(deleteForm(EMAIL));

        expect(disableSubscription).toHaveBeenCalledWith("SUB_123", "tok_456");
        expect(disableSubscription.mock.invocationCallOrder[0]).toBeLessThan(
          tx.item.deleteMany.mock.invocationCallOrder[0],
        );
        expect(signOut).toHaveBeenCalled();
      },
    );

    it("keeps the account when the cancel fails, so it can't go on charging", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      prisma.user.findUnique.mockResolvedValue(subscribed("active"));
      disableSubscription.mockRejectedValue(new Error("Paystack down"));

      const result = await deleteAccount(deleteForm(EMAIL));

      expect(result).toEqual({
        success: false,
        error:
          "We couldn't cancel your Pro subscription, so your account wasn't deleted. Please try again.",
      });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(deleteObjectsWithPrefix).not.toHaveBeenCalled();
      expect(signOut).not.toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it.each(["non-renewing", "completed", "cancelled", null])(
      "doesn't call Paystack for a %s subscription",
      async (status) => {
        prisma.user.findUnique.mockResolvedValue(subscribed(status));
        withTransaction();

        await deleteAccount(deleteForm(EMAIL));

        expect(disableSubscription).not.toHaveBeenCalled();
        expect(prisma.$transaction).toHaveBeenCalled();
      },
    );

    it("doesn't call Paystack without an email token to cancel with", async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...subscribed("active"),
        paystackEmailToken: null,
      });
      withTransaction();

      await deleteAccount(deleteForm(EMAIL));

      expect(disableSubscription).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
    });
  });

  it("reports a missing account", async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    const result = await deleteAccount(deleteForm(EMAIL));

    expect(result).toEqual({
      success: false,
      error: "Your account could not be found.",
    });
  });

  it("leaves the session intact when the deletion fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    prisma.user.findUnique.mockResolvedValue({ email: EMAIL });
    prisma.$transaction.mockRejectedValue(new Error("deadlock"));

    const result = await deleteAccount(deleteForm(EMAIL));

    expect(result).toEqual({
      success: false,
      error: "Could not delete your account",
    });
    expect(signOut).not.toHaveBeenCalled();
    expect(deleteObjectsWithPrefix).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
