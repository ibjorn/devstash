import { after, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findOutstandingResetToken,
  resetTokenIssuedAt,
} from "@/lib/auth/reset-token";
import { isWithinEmailCooldown } from "@/lib/auth/email-cooldown";
import { issuePasswordResetEmail } from "@/lib/email/send-password-reset";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { parseJsonBody } from "@/lib/parse-json-body";
import { checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

// Identical for every outcome. Whether the address is unknown, OAuth-only or a
// live password account, the caller learns nothing about which.
const ACKNOWLEDGED =
  "If that address has an account, we've sent a link to it.";

function acknowledge() {
  return NextResponse.json({ success: true, data: { message: ACKNOWLEDGED } });
}

// POST /api/auth/password/forgot — request a password reset link.
// Static segments win over the sibling [...nextauth] catch-all.
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, forgotPasswordSchema, {
    invalid: "Enter a valid email address",
  });
  if (parsed.response) return parsed.response;

  const { email } = parsed.data;

  // Safe to run before the response is flushed: the key is the IP, and Redis
  // has no idea whether the address in the body belongs to an account, so this
  // costs the same for every caller and doesn't reopen the oracle after() was
  // added to close.
  const limit = await checkRateLimit(
    "passwordForgot",
    clientIp(request.headers),
  );
  if (!limit.success) return tooManyRequests(limit);

  // Every branch below takes a measurably different amount of time — a real
  // send costs ~1-3s where an unknown address costs ~250ms — and an identical
  // response body is worth nothing if a stopwatch still answers "does this
  // account exist?". after() runs the work once the response has been flushed,
  // so the caller sees the same latency whatever the address turns out to be.
  after(async () => {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, name: true, password: true },
      });

      // Nothing to do for an address with no account at all
      if (!user) return;

      // Throttle without a schema change: VerificationToken has no createdAt,
      // but expires is always issuedAt + TTL, so the issue time is recoverable
      const outstanding = await findOutstandingResetToken(email);
      if (
        outstanding &&
        isWithinEmailCooldown(resetTokenIssuedAt(outstanding.expires))
      ) {
        return;
      }

      // An OAuth-only account (password null) still gets a link — it sets a
      // first password, which is the only route a GitHub-first user has to
      // email sign-in, since registration 409s on their existing address. The
      // email copy adapts so it doesn't offer to reset a password they never
      // had.
      const sent = await issuePasswordResetEmail({
        email,
        name: user.name,
        userId: user.id,
        hasPassword: Boolean(user.password),
      });
      if (!sent.success) {
        console.error(
          "Password reset email not sent for %s: %s",
          email,
          sent.error,
        );
      }
    } catch (error) {
      // Nothing to surface — the response has already gone out, and a failure
      // here must not become an existence oracle either
      console.error("Password reset request errored:", error);
    }
  });

  return acknowledge();
}
