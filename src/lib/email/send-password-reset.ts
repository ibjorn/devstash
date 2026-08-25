import { createPasswordResetToken } from "@/lib/auth/reset-token";
import { getAppUrl } from "@/lib/email/app-url";
import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import {
  passwordResetEmailHtml,
  passwordResetEmailText,
} from "@/lib/email/templates";

interface IssuePasswordResetEmailOptions {
  email: string;
  name?: string | null;
  /** Scopes Resend's idempotency key so retries for one user collapse. */
  userId: string;
  /** False for an OAuth-only account — the email offers to set a first password. */
  hasPassword: boolean;
}

/**
 * Mints a password-reset token and emails the link.
 *
 * Never throws — it reports failure in the result instead. The one caller is
 * an endpoint that answers identically whatever happens, so a thrown error
 * here would turn a deliberate non-answer into a 500 that tells an attacker
 * the address exists.
 */
export async function issuePasswordResetEmail({
  email,
  name,
  userId,
  hasPassword,
}: IssuePasswordResetEmailOptions): Promise<SendEmailResult> {
  let rawToken: string;
  let resetUrl: string;

  try {
    rawToken = await createPasswordResetToken(email);
    resetUrl = `${getAppUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  } catch (error) {
    console.error("Could not issue a password reset token:", error);
    return { success: false, error: "Could not issue a reset link" };
  }

  return sendEmail({
    to: email,
    subject: hasPassword
      ? "Reset your DevStash password"
      : "Set a password for DevStash",
    html: passwordResetEmailHtml({ resetUrl, name, hasPassword }),
    text: passwordResetEmailText({ resetUrl, hasPassword }),
    // Each issued token gets its own key, so a genuine new request still sends
    // while a duplicated request for the same token does not
    idempotencyKey: `password-reset/${userId}/${rawToken.slice(0, 16)}`,
  });
}
