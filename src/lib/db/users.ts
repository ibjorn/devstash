import { prisma } from "@/lib/prisma";
import type { CurrentUser } from "@/types/users";

// Returns null when the session's user id has no row — the session is a JWT,
// so it stays syntactically valid after the user is deleted. Callers must
// treat null as "stale session" rather than letting it throw.
export async function getCurrentUser(
  userId: string
): Promise<CurrentUser | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, image: true },
  });
}
