import { DEMO_USER_EMAIL } from "@/lib/db/demo-user";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/types/users";

// Demo-scoped until auth; NextAuth will supply the session user's email here
export async function getCurrentUser(): Promise<CurrentUser> {
  return prisma.user.findUniqueOrThrow({
    where: { email: DEMO_USER_EMAIL },
    select: { name: true, email: true, image: true },
  });
}
