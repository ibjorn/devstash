import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/**
 * Every limit in one table so the numbers can be read and adjusted together
 * rather than being scattered across the routes that enforce them.
 *
 * `signIn` is keyed by IP + email and stops someone hammering one account.
 * `signInPerIp` is the looser ceiling that catches the opposite shape of
 * attack — credential stuffing walks thousands of addresses a couple of
 * attempts each, so it never trips a per-account limit. It has to be generous:
 * a whole office behind one NAT shares an IP.
 */
export const RATE_LIMITS = {
  signIn: { limit: 5, window: "15 m" },
  signInPerIp: { limit: 20, window: "15 m" },
  register: { limit: 3, window: "1 h" },
  passwordForgot: { limit: 3, window: "1 h" },
  passwordReset: { limit: 5, window: "15 m" },
  verifyResend: { limit: 3, window: "15 m" },
  // Not a public endpoint — this one guesses the *current* password from an
  // already-authenticated session, so it's keyed by user id, not IP.
  changePassword: { limit: 5, window: "15 m" },
} as const satisfies Record<string, { limit: number; window: Duration }>;

export type RateLimitName = keyof typeof RATE_LIMITS;

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Unix ms at which the window frees up. 0 when no limiter ran. */
  reset: number;
  /** Whole seconds until a retry can succeed; 0 when no limiter ran. */
  retryAfterSeconds: number;
}

// Returned whenever no limiter ran — missing config, or Upstash unreachable.
// Rate limiting fails OPEN by design: an outage at Upstash must not become an
// outage of sign-in.
const ALLOWED: RateLimitResult = {
  success: true,
  remaining: Number.POSITIVE_INFINITY,
  reset: 0,
  retryAfterSeconds: 0,
};

/**
 * Bucket every request with no usable IP header shares. On Vercel
 * `x-forwarded-for` is always set and is not caller-controlled, but behind any
 * other proxy — or in local dev — it may be absent, and then these all count
 * against each other. That is deliberate: the alternative is a hole that opens
 * whenever the header is missing.
 */
const UNKNOWN_IP = "unknown-ip";

let redis: Redis | null | undefined;

// Lazy, for the same reason src/lib/email/resend.ts is: the constructor throws
// on missing credentials, so building the client at module scope would fail
// every build that doesn't have them.
function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    console.warn(
      "Rate limiting is OFF: UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set",
    );
    redis = null;
    return null;
  }

  redis = new Redis({ url, token });
  return redis;
}

const limiters = new Map<RateLimitName, Ratelimit>();

function getLimiter(name: RateLimitName): Ratelimit | null {
  const cached = limiters.get(name);
  if (cached) return cached;

  const client = getRedis();
  if (!client) return null;

  const { limit, window } = RATE_LIMITS[name];
  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(limit, window),
    // Namespaced per limit so two limiters can never share a counter, and the
    // whole app's keys stay distinguishable in a shared Redis
    prefix: `devstash:rl:${name}`,
    // Off: it costs extra Redis commands per check and the free tier's 10k/day
    // is the budget this has to live inside
    analytics: false,
    // Skips the Redis round trip for an identifier already known to be blocked
    // within this instance. Per-limiter, since the same identifier (an IP)
    // appears under several limits and must not carry a block between them.
    ephemeralCache: new Map<string, number>(),
  });

  limiters.set(name, limiter);
  return limiter;
}

function secondsUntil(reset: number): number {
  // At least 1 — a Retry-After of 0 invites an immediate retry that still fails
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

/**
 * Consume one token for `key` under the named limit.
 *
 * Never throws and never blocks on failure: if Upstash is unreachable the
 * request is allowed through.
 */
export async function checkRateLimit(
  name: RateLimitName,
  key: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(name);
  if (!limiter) return ALLOWED;

  try {
    const { success, remaining, reset } = await limiter.limit(key);
    return {
      success,
      remaining,
      reset,
      retryAfterSeconds: secondsUntil(reset),
    };
  } catch (error) {
    console.error("Rate limit check failed for %s — allowing:", name, error);
    return ALLOWED;
  }
}

/**
 * Read `key`'s standing under the named limit *without* spending a token.
 *
 * For a limit that is never cleared, counting successes as well as failures
 * eventually punishes the honest traffic sharing an address. Peeking here and
 * spending only on a genuine failure keeps the budget aimed at attacks.
 */
export async function peekRateLimit(
  name: RateLimitName,
  key: string,
): Promise<RateLimitResult> {
  const limiter = getLimiter(name);
  if (!limiter) return ALLOWED;

  try {
    const { remaining, reset } = await limiter.getRemaining(key);
    return {
      success: remaining > 0,
      remaining,
      reset,
      retryAfterSeconds: secondsUntil(reset),
    };
  } catch (error) {
    console.error("Rate limit peek failed for %s — allowing:", name, error);
    return ALLOWED;
  }
}

/**
 * Drop the tokens `key` has used. Called after a *successful* sign-in so a
 * legitimate user's failures don't accumulate against them across a session of
 * ordinary logins.
 *
 * Only ever applied to the per-account bucket. Clearing the per-IP one on
 * success would hand an attacker holding a single valid account an unlimited
 * reset lever for the credential-stuffing ceiling.
 */
export async function clearRateLimit(
  name: RateLimitName,
  key: string,
): Promise<void> {
  const limiter = getLimiter(name);
  if (!limiter) return;

  try {
    await limiter.resetUsedTokens(key);
  } catch (error) {
    console.error("Rate limit reset failed for %s:", name, error);
  }
}

/**
 * Caller's IP, as far as it can be trusted. `x-forwarded-for` is a client-to-
 * proxy chain, so the first entry is the originating client; Vercel rewrites
 * the header, but anywhere it isn't rewritten a caller can put whatever it
 * likes there.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || UNKNOWN_IP;
}

/** Key for a limit that narrows an IP to one target address. */
export function ipEmailKey(ip: string, email: string): string {
  return `${ip}|${email}`;
}

function humanDelay(seconds: number): string {
  if (seconds <= 90) return "a minute";

  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minutes`;

  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "an hour" : `${hours} hours`;
}

export function rateLimitMessage(retryAfterSeconds: number): string {
  return `Too many attempts. Please try again in ${humanDelay(retryAfterSeconds)}.`;
}

/**
 * 429 in the project's `{ success, error }` shape — which is what every auth
 * form already reads off a non-ok response, so they toast this without change.
 */
export function tooManyRequests(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { success: false, error: rateLimitMessage(result.retryAfterSeconds) },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSeconds) },
    },
  );
}
