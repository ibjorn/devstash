import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

// Edge runtime: build a NextAuth instance from the adapter-free config so the
// proxy can read the JWT session without pulling Prisma into the edge bundle.
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (req.auth) return;

  // Custom sign-in page; callbackUrl returns here after auth. Kept as a
  // relative path so it can't be turned into an off-site redirect.
  const signInUrl = new URL("/sign-in", req.nextUrl.origin);
  signInUrl.searchParams.set(
    "callbackUrl",
    `${req.nextUrl.pathname}${req.nextUrl.search}`,
  );
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
