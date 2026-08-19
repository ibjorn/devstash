import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findOutstandingToken,
  tokenIssuedAt,
} from "@/lib/auth/verification-token";
import { issueVerificationEmail } from "@/lib/email/send-verification";
import { resendVerificationSchema } from "@/lib/validation/auth";

/** Minimum gap between two verification emails for the same address. */
const COOLDOWN_MS = 5 * 60 * 1000;

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

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, emailVerified: true, password: true },
    });

    // Nothing to do for an unknown address, one that's already confirmed, or
    // an OAuth-only account that never had an email to verify
    if (!user || user.emailVerified || !user.password) return acknowledge();

    // Throttle without a schema change: VerificationToken has no createdAt, but
    // expires is always issuedAt + TTL, so the issue time is recoverable
    const outstanding = await findOutstandingToken(email);
    if (
      outstanding &&
      Date.now() - tokenIssuedAt(outstanding.expires).getTime() < COOLDOWN_MS
    ) {
      return acknowledge();
    }

    const sent = await issueVerificationEmail({
      email,
      name: user.name,
      userId: user.id,
    });
    if (!sent.success) {
      console.error("Verification resend failed for %s: %s", email, sent.error);
    }
  } catch (error) {
    // Still acknowledge — a failure here must not become an existence oracle
    console.error("Verification resend errored:", error);
  }

  return acknowledge();
}
