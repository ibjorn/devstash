import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isPrismaError } from "@/lib/prisma-errors";
import { parseJsonBody } from "@/lib/parse-json-body";
import { hashPassword } from "@/lib/auth/password";
import { registerSchema } from "@/lib/validation/auth";
import { issueVerificationEmail } from "@/lib/email/send-verification";
import { skipEmailVerification } from "@/lib/auth/verification-flag";
import { checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

const EMAIL_TAKEN = "An account with that email already exists";

// Static segments win over the sibling [...nextauth] catch-all, so this owns
// POST /api/auth/register.
export async function POST(request: Request) {
  const parsed = await parseJsonBody(request, registerSchema, {
    invalid: "Invalid registration details",
  });
  if (parsed.response) return parsed.response;

  const { name, email, password } = parsed.data;

  // After validation, not before: a malformed body is the caller's own bug and
  // shouldn't burn one of the few registrations an honest visitor is allowed.
  const limit = await checkRateLimit("register", clientIp(request.headers));
  if (!limit.success) return tooManyRequests(limit);

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: EMAIL_TAKEN },
        { status: 409 },
      );
    }

    const skipped = skipEmailVerification();

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await hashPassword(password),
        // With verification skipped, stamp the account verified at the one
        // point it's created. Everything downstream — the sign-in gate in
        // authorize() and the GitHub account-linking gate in src/auth.ts — keeps
        // reading emailVerified and needs no flag check of its own.
        ...(skipped ? { emailVerified: new Date() } : {}),
      },
      select: { id: true, name: true, email: true },
    });

    if (!skipped) {
      // A send failure must not fail the request. The account exists and is
      // recoverable through the resend endpoint; rolling it back would leave the
      // user unable to register at all, and throwing here would strand the row.
      const sent = await issueVerificationEmail({
        email: user.email,
        name: user.name,
        userId: user.id,
      });
      if (!sent.success) {
        console.error("Verification email not sent for %s: %s", user.email, sent.error);
      }
    }

    // The form is a client component and can't read the flag, so the response
    // carries the outcome — otherwise it would promise an email nobody sent.
    return NextResponse.json(
      { success: true, data: { ...user, emailVerificationSkipped: skipped } },
      { status: 201 },
    );
  } catch (error) {
    // Two concurrent registrations can slip past the check above; the unique
    // index is the real guard
    if (isPrismaError(error, "P2002")) {
      return NextResponse.json(
        { success: false, error: EMAIL_TAKEN },
        { status: 409 },
      );
    }

    console.error("Registration failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not create account" },
      { status: 500 },
    );
  }
}
