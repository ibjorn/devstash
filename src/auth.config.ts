import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

// Shared field definitions so the placeholder below and the real provider in
// src/auth.ts render an identical sign-in form.
export const credentialFields = {
  email: { label: "Email", type: "email" },
  password: { label: "Password", type: "password" },
};

// Edge-safe config: providers and callbacks only, no adapter.
// The Prisma adapter can't run on the edge runtime, so the proxy builds its
// own NextAuth instance from this config while src/auth.ts adds the adapter.
// Callbacks live here so req.auth in the proxy has the same shape as the
// session on the server.
export default {
  // Custom sign-in UI replaces NextAuth's built-in page. NextAuth also sends
  // auth errors here as ?error=..., which the page renders.
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    GitHub,
    // Placeholder only — verifying a password needs Prisma and bcryptjs, and
    // neither runs on the edge. src/auth.ts swaps in the working provider.
    Credentials({ credentials: credentialFields, authorize: () => null }),
  ],
  callbacks: {
    session({ session, token }) {
      // With the JWT strategy the user id rides on token.sub
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
