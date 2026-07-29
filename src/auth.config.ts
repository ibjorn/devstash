import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";

// Edge-safe config: providers and callbacks only, no adapter.
// The Prisma adapter can't run on the edge runtime, so the proxy builds its
// own NextAuth instance from this config while src/auth.ts adds the adapter.
// Callbacks live here so req.auth in the proxy has the same shape as the
// session on the server.
export default {
  providers: [GitHub],
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
