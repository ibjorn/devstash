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
    // Linking an OAuth sign-in to an existing account with the same email is
    // off by default because providers vary in how (or whether) they verify
    // addresses. The flag is all-or-nothing, so the real gate is the signIn
    // callback in src/auth.ts, which only permits the link when the existing
    // user's emailVerified is set. The proxy builds its own instance from this
    // config without that callback, but it never handles a sign-in — its
    // matcher is /dashboard/:path* — so the ungated flag is unreachable there.
    GitHub({ allowDangerousEmailAccountLinking: true }),
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
