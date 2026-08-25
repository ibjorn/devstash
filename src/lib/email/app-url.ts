/**
 * Absolute base URL for links that leave the app. Read from config rather than
 * request headers — a Host header is attacker-controlled, and a link that
 * verifies an address or resets a password is exactly the thing you don't want
 * pointed somewhere else.
 */
export function getAppUrl(): string {
  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL is not set");
  return appUrl.replace(/\/$/, "");
}
