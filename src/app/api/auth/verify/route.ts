import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lookupVerificationToken } from "@/lib/auth/verification-token";

function redirectTo(request: Request, query: string) {
  return NextResponse.redirect(new URL(`/sign-in?${query}`, request.url));
}

// GET /api/auth/verify?token=... — the link from the verification email.
export async function GET(request: Request) {
  const rawToken = new URL(request.url).searchParams.get("token");
  if (!rawToken) return redirectTo(request, "error=VerificationInvalid");

  try {
    const lookup = await lookupVerificationToken(rawToken);

    if (lookup.status === "unknown") {
      return redirectTo(request, "error=VerificationInvalid");
    }

    const user = await prisma.user.findUnique({
      where: { email: lookup.email },
      select: { emailVerified: true },
    });

    // Verifying twice is a no-op, and it's the normal outcome when a mail
    // client prefetched the link — say so rather than reporting a failure
    if (user?.emailVerified) return redirectTo(request, "verified=already");

    // Only reachable once the address is confirmed unverified, so an expired
    // link is genuinely stale and the user needs a fresh one
    if (lookup.status === "expired") {
      return redirectTo(request, "error=VerificationExpired");
    }

    if (!user) return redirectTo(request, "error=VerificationInvalid");

    await prisma.user.update({
      where: { email: lookup.email },
      data: { emailVerified: new Date() },
    });

    return redirectTo(request, "verified=1");
  } catch (error) {
    console.error("Email verification failed:", error);
    return redirectTo(request, "error=VerificationFailed");
  }
}
