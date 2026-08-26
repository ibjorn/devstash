import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import {
  consumePasswordResetToken,
  lookupPasswordResetToken,
} from "@/lib/auth/reset-token";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { checkRateLimit, clientIp, tooManyRequests } from "@/lib/rate-limit";

// One message for every dead token. Distinguishing "never existed" from
// "expired" here would say more than the page already told the user, and this
// endpoint is reachable without one.
const LINK_DEAD =
  "That reset link is no longer valid. Request a new one and try again.";

function badRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

// POST /api/auth/password/reset — spend a reset token and set the password.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON");
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return badRequest(
      parsed.error.issues[0]?.message ?? "Invalid password details",
    );
  }

  const { token, password } = parsed.data;

  // Keyed by IP alone — the token is the secret being guessed here, so keying
  // by it would give each guess its own fresh budget.
  const limit = await checkRateLimit(
    "passwordReset",
    clientIp(request.headers),
  );
  if (!limit.success) return tooManyRequests(limit);

  try {
    // Re-checked here rather than trusted from the page render: the token can
    // expire between the form appearing and the user submitting it, and this
    // endpoint is callable directly regardless
    const lookup = await lookupPasswordResetToken(token);
    if (lookup.status !== "valid") return badRequest(LINK_DEAD);

    const user = await prisma.user.findUnique({
      where: { email: lookup.email },
      select: { id: true, emailVerified: true },
    });
    if (!user) return badRequest(LINK_DEAD);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(password),
        // Following an emailed link proves control of the address just as the
        // verification flow does, so an unverified account is confirmed here
        // rather than being left unable to sign in with the password it just
        // set. It also lets an OAuth-only account past the GitHub linking gate
        // in src/auth.ts. Existing timestamps are preserved.
        emailVerified: user.emailVerified ?? new Date(),
      },
    });

    // Only after the write — a failed update leaves the link usable for a retry
    await consumePasswordResetToken(token);

    return NextResponse.json({
      success: true,
      data: { message: "Password updated" },
    });
  } catch (error) {
    console.error("Password reset failed:", error);
    return NextResponse.json(
      { success: false, error: "Could not update your password" },
      { status: 500 },
    );
  }
}
