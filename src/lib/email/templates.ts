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
