import { Resend } from "resend";

export interface SendEmailResult {
  success: boolean;
  error?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Plain-text alternative — improves deliverability and spam scoring. */
  text?: string;
  /** Collapses accidental double-sends of the same logical email. */
  idempotencyKey?: string;
}

// The Resend constructor throws when RESEND_API_KEY is unset, so it's built on
// first use rather than at import — a build or a test run without the key set
// shouldn't fail just because this module got pulled in.
let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not set");
    client = new Resend(apiKey);
  }
  return client;
}

/**
 * Sends one transactional email.
 *
 * resend.emails.send resolves with `{ data, error }` rather than throwing on an
 * API error, so the error has to be read off the result — ignoring it is how
 * you ship a send that silently does nothing.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  idempotencyKey,
}: SendEmailOptions): Promise<SendEmailResult> {
  const from = process.env.EMAIL_FROM;
  if (!from) return { success: false, error: "EMAIL_FROM is not set" };

  try {
    const { error } = await getClient().emails.send(
      { from, to, subject, html, text },
      idempotencyKey ? { idempotencyKey } : undefined,
    );

    if (error) {
      console.error("Resend rejected the email:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Could not reach Resend:", error);
    return { success: false, error: "Email service unavailable" };
  }
}
