export const DEFAULT_SIGNED_IN_PATH = "/dashboard";

// A placeholder origin to resolve against: anything that resolves somewhere
// else was never a same-origin path
const SENTINEL_ORIGIN = "http://sentinel.invalid";

// callbackUrl reaches us from a query string or a hidden form field, so it is
// user-controlled. Only same-origin paths are allowed through. Checking the
// string's prefix isn't enough: browsers read "\" as "/" and drop tabs and
// newlines, so "/\evil.com" and "/\t/evil.com" both become "//evil.com".
// Resolving it the way a browser would and comparing origins catches every
// such spelling, and the normalised path is what gets returned.
//
// The normalised path is checked too, not just the input: resolving dot
// segments turns the harmless "/..//evil.com" (the path "//evil.com" on this
// host) into a bare "//evil.com", which is off-site once it's sent back.
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return DEFAULT_SIGNED_IN_PATH;
  }

  const path = sameOriginPath(value);
  if (path === null || sameOriginPath(path) !== path) {
    return DEFAULT_SIGNED_IN_PATH;
  }
  return path;
}

// The path a browser would land on for `value`, or null if it leaves the site
function sameOriginPath(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value, SENTINEL_ORIGIN);
  } catch {
    return null;
  }
  if (url.origin !== SENTINEL_ORIGIN) return null;
  return url.pathname + url.search + url.hash;
}
