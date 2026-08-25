import { createVerificationToken } from "@/lib/auth/verification-token";
import { getAppUrl } from "@/lib/email/app-url";
import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import {
  verificationEmailHtml,
  verificationEmailText,
} from "@/lib/email/templates";

interface IssueVerificationEmailOptions {
  email: string;
  name?: string | null;
  /** Scopes Resend's idempotency key so retries for one user collapse. */
  userId: string;
}

/**
 * Mints a verification token and emails the link. Shared by registration and
 * the resend endpoint so the two can't drift apart.
 *
 * Never throws — it reports failure in the result instead. Registration calls
 * this *after* creating the account, and a thrown error there would 500 a
 * request that already wrote a User row, leaving the caller thinking
 * registration failed when it didn't.
 */
export async function issueVerificationEmail({
  email,
  name,
  userId,
}: IssueVerificationEmailOptions): Promise<SendEmailResult> {
  let rawToken: string;
  let verifyUrl: string;

  try {
    rawToken = await createVerificationToken(email);
    verifyUrl = `${getAppUrl()}/api/auth/verify?token=${encodeURIComponent(rawToken)}`;
  } catch (error) {
    console.error("Could not issue a verification token:", error);
    return { success: false, error: "Could not issue a verification link" };
  }

  return sendEmail({
    to: email,
    subject: "Verify your email for DevStash",
    html: verificationEmailHtml({ verifyUrl, name }),
    text: verificationEmailText(verifyUrl),
    // Each issued token gets its own key, so a genuine resend still sends while
    // a duplicated request for the same token does not
    idempotencyKey: `verify-email/${userId}/${rawToken.slice(0, 16)}`,
  });
}
