import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findOutstandingToken,
  tokenIssuedAt,
} from "@/lib/auth/verification-token";
import { EMAIL_COOLDOWN_MS } from "@/lib/auth/email-cooldown";
import { issueVerificationEmail } from "@/lib/email/send-verification";
import { resendVerificationSchema } from "@/lib/validation/auth";
import { skipEmailVerification } from "@/lib/auth/verification-flag";
import {
  checkRateLimit,
  clientIp,
  ipEmailKey,
  tooManyRequests,
} from "@/lib/rate-limit";

// Identical for every outcome. Whether the address is unknown, already
// verified, or genuinely pending, the caller learns nothing about which.
const ACKNOWLEDGED =
  "If that address needs verifying, we've sent a new link to it.";

function acknowledge() {
  return NextResponse.json({ success: true, data: { message: ACKNOWLEDGED } });
}

// POST /api/auth/verify/resend — request a fresh verification link.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Request body must be valid JSON" },
      { status: 400 },
    );
  }

  const parsed = resendVerificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error:
          parsed.error.issues[0]?.message ?? "Enter a valid email address",
      },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  // Ahead of the skip check, so this endpoint is never unbounded and its
  // externally visible behaviour doesn't change when the flag is flipped.
  // Keying by IP + email costs the same whatever the address turns out to be —
  // Redis has no idea whether an account exists — so it adds no timing signal.
  const limit = await checkRateLimit(
    "verifyResend",
    ipEmailKey(clientIp(request.headers), email),
  );
  if (!limit.success) return tooManyRequests(limit);

  // Nothing to verify while verification is skipped. Same acknowledgement as
  // every other outcome, so this doesn't become the one branch that answers
  // differently and turns the endpoint into an existence oracle.
  if (skipEmailVerification()) return acknowledge();

  // Deferred past the response flush for the reason the sibling
  // /api/auth/password/forgot documents: a pending address triggers a live
  // Resend call costing seconds where an unknown one returns in milliseconds,
  // and an identical response body proves nothing while a stopwatch still
  // answers "does this account exist?".
  after(async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, emailVerified: true, password: true },
      });

      // Nothing to do for an unknown address, one that's already confirmed, or
      // an OAuth-only account that never had an email to verify
      if (!user || user.emailVerified || !user.password) return;

      // Throttle without a schema change: VerificationToken has no createdAt,
      // but expires is always issuedAt + TTL, so the issue time is recoverable
      const outstanding = await findOutstandingToken(email);
      if (
        outstanding &&
        Date.now() - tokenIssuedAt(outstanding.expires).getTime() <
          EMAIL_COOLDOWN_MS
      ) {
        return;
      }

      const sent = await issueVerificationEmail({
        email,
        name: user.name,
        userId: user.id,
      });
      if (!sent.success) {
        console.error(
          "Verification resend failed for %s: %s",
          email,
          sent.error,
        );
      }
    } catch (error) {
      // Nothing to surface — the response has already gone out, and a failure
      // here must not become an existence oracle either
      console.error("Verification resend errored:", error);
    }
  });

  return acknowledge();
}
