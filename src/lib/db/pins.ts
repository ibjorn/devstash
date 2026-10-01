import { prisma } from "@/lib/prisma";

/**
 * Sets an item's pinned flag. False when no item of the user's matched.
 *
 * Raw SQL for the reason src/lib/db/favorites.ts gives: pinning isn't an edit,
 * and `update` would bump `@updatedAt`, changing the drawer's "Updated" date
 * and the item's place in updatedAt-sorted lists. Ownership is in the WHERE
 * clause, so another user's id and a missing one both match zero rows.
 */
export async function setItemPinned(
  userId: string,
  id: string,
  isPinned: boolean,
): Promise<boolean> {
  const count = await prisma.$executeRaw`
    UPDATE "Item" SET "isPinned" = ${isPinned}
    WHERE "id" = ${id} AND "userId" = ${userId}`;
  return count > 0;
}
