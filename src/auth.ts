import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signInSchema } from "@/lib/validation/auth";
import authConfig, { credentialFields } from "./auth.config";

// The real credentials provider — node runtime only. Returning null for every
// failure keeps the response identical whether the email is unknown, the
// account is OAuth-only, or the password is simply wrong.
const credentials = Credentials({
  credentials: credentialFields,
  authorize: async (raw) => {
    const parsed = signInSchema.safeParse(raw);
    if (!parsed.success) return null;

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true, name: true, email: true, image: true, password: true },
    });

    // OAuth-only users have a null hash and must not be signable this way
    if (!user?.password) return null;

    const passwordMatches = await bcrypt.compare(
      parsed.data.password,
      user.password,
    );
    if (!passwordMatches) return null;

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
