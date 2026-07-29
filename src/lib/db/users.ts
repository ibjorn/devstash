import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/types/users";

// Scoped to the signed-in user. Callers live behind the proxy matcher, so a
// missing session means the route is unprotected — a bug worth surfacing
// rather than silently rendering someone else's data.
export async function getCurrentUser(): Promise<CurrentUser> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("getCurrentUser called without an authenticated session");
  }

  return prisma.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { name: true, email: true, image: true },
  });
}
