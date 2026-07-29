export const DEFAULT_SIGNED_IN_PATH = "/dashboard";

// callbackUrl reaches us from a query string or a hidden form field, so it is
// user-controlled. Only same-origin paths are allowed through — "//evil.com"
// and "https://evil.com" would both be off-site redirects.
export function safeRedirectPath(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return DEFAULT_SIGNED_IN_PATH;
  }
  return value;
}
