/**
 * Plain HTML strings rather than React Email — one transactional email doesn't
 * justify the extra toolchain. Styles are inline and the layout is a single
 * centred block, because email clients strip <style> blocks and support for
 * anything beyond basic CSS is patchy.
 */

const BRAND = "#8b5cf6";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface VerificationEmailOptions {
  verifyUrl: string;
  name?: string | null;
}

export function verificationEmailHtml({
  verifyUrl,
  name,
}: VerificationEmailOptions): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const url = escapeHtml(verifyUrl);

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e5e5e5;">
    <div style="max-width:480px;margin:0 auto;background:#171717;border:1px solid #262626;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fafafa;">Verify your email</h1>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;">
        Confirm this address to finish setting up your DevStash account.
      </p>
      <a href="${url}" style="display:inline-block;padding:12px 20px;background:${BRAND};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        Verify email address
      </a>
      <p style="margin:24px 0 8px;font-size:13px;line-height:1.6;color:#a3a3a3;">
        If the button doesn't work, paste this into your browser:
      </p>
      <p style="margin:0 0 24px;font-size:12px;line-height:1.6;color:#a3a3a3;word-break:break-all;">${url}</p>
      <p style="margin:0;padding-top:20px;border-top:1px solid #262626;font-size:12px;line-height:1.6;color:#737373;">
        This link expires in 24 hours. If you didn't create a DevStash account, you can ignore this email.
      </p>
    </div>
  </body>
</html>`;
}

export function verificationEmailText(verifyUrl: string): string {
  return `Verify your email to finish setting up your DevStash account:\n\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create a DevStash account, you can ignore this email.`;
}

interface PasswordResetEmailOptions {
  resetUrl: string;
  name?: string | null;
  /**
   * False for an account that only ever signed in with GitHub. The link sets a
   * first password rather than replacing one, and the copy should say so — a
   * "reset your password" email to someone who never had one reads like a
   * phishing attempt.
   */
  hasPassword: boolean;
}

export function passwordResetEmailHtml({
  resetUrl,
  name,
  hasPassword,
}: PasswordResetEmailOptions): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const url = escapeHtml(resetUrl);
  const heading = hasPassword ? "Reset your password" : "Set a password";
  const intro = hasPassword
    ? "Someone asked to reset the password on your DevStash account. Use the button below to choose a new one."
    : "Your DevStash account signs in with GitHub. Use the button below to set a password so you can sign in with your email address too.";
  const action = hasPassword ? "Reset password" : "Set password";
  const footer = hasPassword
    ? "This link expires in 1 hour and can only be used once. If you didn't ask for a password reset, you can ignore this email — your password won't change."
    : "This link expires in 1 hour and can only be used once. If you didn't ask for this, you can ignore this email — your account won't change, and you can keep signing in with GitHub.";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#e5e5e5;">
    <div style="max-width:480px;margin:0 auto;background:#171717;border:1px solid #262626;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#fafafa;">${heading}</h1>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.6;">${greeting}</p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;">${intro}</p>
      <a href="${url}" style="display:inline-block;padding:12px 20px;background:${BRAND};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
        ${action}
      </a>
      <p style="margin:24px 0 8px;font-size:13px;line-height:1.6;color:#a3a3a3;">
        If the button doesn't work, paste this into your browser:
      </p>
      <p style="margin:0 0 24px;font-size:12px;line-height:1.6;color:#a3a3a3;word-break:break-all;">${url}</p>
      <p style="margin:0;padding-top:20px;border-top:1px solid #262626;font-size:12px;line-height:1.6;color:#737373;">
        ${footer}
      </p>
    </div>
  </body>
</html>`;
}

export function passwordResetEmailText({
  resetUrl,
  hasPassword,
}: Omit<PasswordResetEmailOptions, "name">): string {
  return hasPassword
    ? `Someone asked to reset the password on your DevStash account. Choose a new one here:\n\n${resetUrl}\n\nThis link expires in 1 hour and can only be used once. If you didn't ask for a password reset, you can ignore this email — your password won't change.`
    : `Your DevStash account signs in with GitHub. Set a password here so you can sign in with your email address too:\n\n${resetUrl}\n\nThis link expires in 1 hour and can only be used once. If you didn't ask for this, you can ignore this email — your account won't change.`;
}
