import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";

const GITHUB_API = "https://api.github.com";

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

/**
 * Replaces the provider's own userinfo fetch so the address we trust is one
 * GitHub says is both primary *and* verified.
 *
 * The stock implementation only consults /user/emails when /user carried no
 * public email, and then takes `emails.find(e => e.primary) ?? emails[0]` with
 * no check of the verified flag — so it can hand back an unconfirmed or even
 * arbitrary address. The signIn gate in src/auth.ts links a GitHub login to an
 * existing password account on the strength of this email, so it has to be
 * proof of ownership, not just something the user typed into GitHub once.
 *
 * Overriding `profile()` instead would be too late: by then the address has
 * already been picked and the verified flag is gone.
 */
async function fetchVerifiedGitHubProfile(accessToken: string) {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "devstash",
  };

  const profile = await fetch(`${GITHUB_API}/user`, { headers }).then((res) =>
    res.json(),
  );

  const response = await fetch(`${GITHUB_API}/user/emails`, { headers });
  // No fallback to profile.email — an unverifiable address is worse than none,
  // because the sign-in simply fails instead of linking the wrong account
  profile.email = null;

  if (response.ok) {
    const emails: GitHubEmail[] = await response.json();
    profile.email =
      emails.find((entry) => entry.primary && entry.verified)?.email ?? null;
  }

  return profile;
}

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
    GitHub({
      allowDangerousEmailAccountLinking: true,
      userinfo: {
        url: `${GITHUB_API}/user`,
        request: ({ tokens }: { tokens: { access_token?: string } }) =>
          fetchVerifiedGitHubProfile(tokens.access_token ?? ""),
      },
    }),
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
