"use server";

import bcrypt from "bcryptjs";
import { ZodError } from "zod";

import { signOut } from "@/auth";
import { hashPassword } from "@/lib/auth/password";
import { resetIdentifier } from "@/lib/auth/reset-token";
import { requireUserId } from "@/lib/db/session-user";
import { prisma } from "@/lib/prisma";
import { deleteObjectsWithPrefix } from "@/lib/r2";
import {
  checkRateLimit,
  clearRateLimit,
  rateLimitMessage,
} from "@/lib/rate-limit";
import { userKeyPrefix } from "@/lib/uploads";
import {
  changePasswordSchema,
  deleteAccountSchema,
} from "@/lib/validation/auth";

/**
 * Actions return `{ success, error, fieldErrors }` per the project's error
 * handling standard. `fieldErrors` is keyed by input name so the dialogs can
 * put a message next to the field that caused it; `error` is for anything with
 * no field to blame and is toasted instead.
 */
export interface ProfileActionResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// First message per field wins — later issues on the same input would only
// push the first one out of view
function toFieldErrors(error: ZodError): ProfileActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field) fieldErrors[field] ??= issue.message;
  }
  return { success: false, fieldErrors };
}

export async function changePassword(
  formData: FormData,
): Promise<ProfileActionResult> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return toFieldErrors(parsed.error);

  try {
    const userId = await requireUserId();

    // This action takes an unlimited number of guesses at the *current*
    // password, which is what makes it a re-auth gate at all. Keyed by user id
    // rather than IP: the session already names the caller, and an attacker
    // sitting on a stolen session can change networks but not who they are.
    const limit = await checkRateLimit("changePassword", userId);
    if (!limit.success) {
      return {
        success: false,
        error: rateLimitMessage(limit.retryAfterSeconds),
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { password: true },
    });

    // The UI hides this form for OAuth-only accounts, so reaching here means
    // the request didn't come from it. Refuse rather than setting a first
    // password without proof the address is the caller's.
    if (!user?.password) {
      return {
        success: false,
        error: "This account signs in with GitHub and has no password to change.",
      };
    }

    const matches = await bcrypt.compare(
      parsed.data.currentPassword,
      user.password,
    );
    if (!matches) {
      return {
        success: false,
        fieldErrors: { currentPassword: "That password is incorrect" },
      };
    }

    await prisma.user.update({
      where: { id: userId },
      data: { password: await hashPassword(parsed.data.password) },
    });

    // The attempts spent getting here ended in a correct password, so they
    // weren't guesses — don't leave them counting against the next change.
    await clearRateLimit("changePassword", userId);

    return { success: true };
  } catch (error) {
    console.error("Change password failed:", error);
    return { success: false, error: "Could not update your password" };
  }
}

// Every upload lives under its owner's id, so one prefix covers them all. After
// the database delete and best effort: the account is already gone, and a
// failure here strands objects nothing can reach rather than a half-deleted
// account — logged so they can be swept by hand.
async function deleteUserFiles(userId: string) {
  try {
    await deleteObjectsWithPrefix(userKeyPrefix(userId));
  } catch (error) {
    console.error("R2 cleanup failed for deleted user %s:", userId, error);
  }
}

export async function deleteAccount(
  formData: FormData,
): Promise<ProfileActionResult> {
  const parsed = deleteAccountSchema.safeParse({
    confirmEmail: formData.get("confirmEmail"),
  });
  if (!parsed.success) return toFieldErrors(parsed.error);

  let userId: string;
  try {
    userId = await requireUserId();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) {
      return { success: false, error: "Your account could not be found." };
    }
    const email = user.email;

    // Re-checked on the server: the dialog only enables its button on a match,
    // but a client guard isn't a control.
    if (parsed.data.confirmEmail !== email.toLowerCase()) {
      return {
        success: false,
        fieldErrors: {
          confirmEmail: "That doesn't match your email address",
        },
      };
    }

    // Explicit dependency order rather than the User cascade, for the reason
    // scripts/delete-non-demo-users.ts documents: Item.itemTypeId is ON DELETE
    // RESTRICT, so a user holding custom item types with items attached can
    // make the cascade fail depending on the order Postgres processes it in.
    await prisma.$transaction(async (tx) => {
      await tx.item.deleteMany({ where: { userId } });
      await tx.collection.deleteMany({ where: { userId } });
      // userId is null for system types, so this only ever hits custom ones
      await tx.itemType.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.session.deleteMany({ where: { userId } });
      // Keyed by email with no relation to User, so nothing else cleans these
      // up. Both kinds: verification tokens sit under the bare address, reset
      // tokens under the namespaced one.
      await tx.verificationToken.deleteMany({
        where: { identifier: { in: [email, resetIdentifier(email)] } },
      });
      await tx.user.delete({ where: { id: userId } });
      // Tags are per-user and go with the User row via onDelete: Cascade.
    });
  } catch (error) {
    console.error("Delete account failed:", error);
    return { success: false, error: "Could not delete your account" };
  }

  await deleteUserFiles(userId);

  // Outside the try: signOut redirects by throwing NEXT_REDIRECT, which has to
  // bubble up rather than be caught as a failure. Clearing the cookie is not
  // optional — the JWT is self-contained, so a session left in place would
  // sail through the proxy and crash every render against a deleted row.
  await signOut({ redirectTo: "/sign-in?deleted=1" });

  // Unreachable: signOut always redirects
  return { success: true };
}
