import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validation/auth";
import { EmailNotVerifiedError, RateLimitedError } from "@/lib/auth/errors";
import {
  checkRateLimit,
  clearRateLimit,
  clientIp,
  ipEmailKey,
  peekRateLimit,
} from "@/lib/rate-limit";
import authConfig, { credentialFields } from "./auth.config";

// The real credentials provider — node runtime only. Returning null keeps the
// response identical whether the email is unknown, the account is OAuth-only,
// or the password is simply wrong. The one distinct outcome is an unverified
// address, which is only reachable once the password already matched.
const credentials = Credentials({
  credentials: credentialFields,
  authorize: async (raw, request) => {
    const parsed = signInSchema.safeParse(raw);
    if (!parsed.success) return null;

    // Auth.js rebuilds this Request from the real incoming headers
    // (@auth/core/lib/actions/callback/index.js), and next-auth's server-action
    // signIn() copies them through from next/headers — so the caller's IP is
    // readable here on both paths. That is the reason the gate sits in
    // authorize() rather than in the server action: an attacker brute-forcing
    // this would POST /api/auth/callback/credentials directly and never touch
    // the action at all.
    const ip = clientIp(request.headers);
    const accountKey = ipEmailKey(ip, parsed.data.email);

    // The wide net first: many addresses, few attempts each, one origin.
    // Read without spending, because unlike the per-account bucket below this
    // one is never cleared on success — clearing it would let anyone holding a
    // single valid account reset the ceiling at will. Counting successes into a
    // bucket that never empties would instead lock out everyone sharing an
    // office or carrier-grade NAT, so only failures are charged to it.
    const perIp = await peekRateLimit("signInPerIp", ip);
    if (!perIp.success) throw new RateLimitedError(perIp.retryAfterSeconds);

    const perAccount = await checkRateLimit("signIn", accountKey);
    if (!perAccount.success) {
      throw new RateLimitedError(perAccount.retryAfterSeconds);
    }

    // Charged only on a genuine credential failure. Stuffing is almost entirely
    // failures, so aiming the ceiling at them costs nothing in detection.
    const chargeFailure = async () => {
      await checkRateLimit("signInPerIp", ip);
      return null;
    };

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        password: true,
        emailVerified: true,
      },
    });

    // OAuth-only users have a null hash and must not be signable this way
    if (!user?.password) return chargeFailure();

    const passwordMatches = await bcrypt.compare(
      parsed.data.password,
      user.password,
    );
    if (!passwordMatches) return chargeFailure();

    // Deliberately after the password check, so this branch is only reachable
    // by someone who already proved they hold the credentials — it tells a
    // stranger nothing about whether an account exists.
    if (!user.emailVerified) throw new EmailNotVerifiedError();

    // Proven credentials, so the attempts spent getting here weren't an attack.
    // Only the per-account bucket is cleared: releasing the per-IP ceiling on a
    // success would let anyone holding one valid account reset the credential-
    // stuffing limit at will.
    await clearRateLimit("signIn", accountKey);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    };
  },
});

// Query string NextAuth is sent back with when an OAuth sign-in matches an
// existing password account we can't safely link to. src/app/(auth)/sign-in
// turns the code into a message.
const LINK_BLOCKED_REDIRECT = "/sign-in?error=AccountLinkBlocked";

// Gate for allowDangerousEmailAccountLinking (set on GitHub in auth.config.ts).
// Auth.js runs this before handleLoginOrRegister does the linking, so denying
// here stops the two accounts merging.
//
// The risk being managed: anyone can register a password account with someone
// else's email, since registration doesn't verify addresses. Auto-linking would
// then hand them that person's GitHub sign-in. Requiring emailVerified means we
// only link when we already know the address belongs to the account holder.
const signInCallback: NonNullable<
  NextAuthConfig["callbacks"]
>["signIn"] = async ({ user, account }) => {
  // Credentials sign-ins were already fully checked by authorize() above
  if (account?.provider !== "github") return true;
  if (!user.email) return false;

  const existing = await prisma.user.findUnique({
    where: { email: user.email },
    select: {
      emailVerified: true,
      accounts: { where: { provider: "github" }, select: { id: true } },
    },
  });

  // No local account yet, or GitHub is already linked — nothing to merge
  if (!existing || existing.accounts.length > 0) return true;

  // A password account holds this email. Link it only if the address is proven.
  if (existing.emailVerified) return true;

  return LINK_BLOCKED_REDIRECT;
};

// Full config — node runtime only (the Prisma adapter isn't edge-compatible).
// The adapter persists User/Account rows on OAuth sign-in; sessions stay in a
// JWT so the edge proxy can read them without a database round trip.
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  // Spread first so the shared session callback survives
  callbacks: { ...authConfig.callbacks, signIn: signInCallback },
  providers: authConfig.providers.map((provider) =>
    typeof provider === "object" && provider.id === "credentials"
      ? credentials
      : provider,
  ),
});
