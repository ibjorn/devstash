import NextAuth from "next-auth";
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

// Full config — node runtime only (the Prisma adapter isn't edge-compatible).
// The adapter persists User/Account rows on OAuth sign-in; sessions stay in a
// JWT so the edge proxy can read them without a database round trip.
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
  providers: authConfig.providers.map((provider) =>
    typeof provider === "object" && provider.id === "credentials"
      ? credentials
      : provider,
  ),
});
