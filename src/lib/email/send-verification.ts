import { createVerificationToken } from "@/lib/auth/verification-token";
import { sendEmail, type SendEmailResult } from "@/lib/email/resend";
import {
  verificationEmailHtml,
  verificationEmailText,
} from "@/lib/email/templates";

/**
 * Absolute base URL for links that leave the app. Read from config rather than
 * request headers — a Host header is attacker-controlled, and a verification
 * link is exactly the thing you don't want pointed somewhere else.
 */
function getAppUrl(): string {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL is not set");
  return appUrl.replace(/\/$/, "");
}

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
