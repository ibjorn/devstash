import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import authConfig from "./auth.config";

// Full config — node runtime only (the Prisma adapter isn't edge-compatible).
// The adapter persists User/Account rows on OAuth sign-in; sessions stay in a
// JWT so the edge proxy can read them without a database round trip.
export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  ...authConfig,
});
