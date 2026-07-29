import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import authConfig from "@/auth.config";

// Edge runtime: build a NextAuth instance from the adapter-free config so the
// proxy can read the JWT session without pulling Prisma into the edge bundle.
const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  if (req.auth) return;

  // NextAuth's built-in sign-in page; callbackUrl returns here after auth
  const signInUrl = new URL("/api/auth/signin", req.nextUrl.origin);
  signInUrl.searchParams.set("callbackUrl", req.nextUrl.href);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ["/dashboard/:path*"],
};
