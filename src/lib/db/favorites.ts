import { prisma } from "@/lib/prisma";

/*
 * Favoriting isn't an edit, so these write `isFavorite` with raw SQL rather
 * than `update`: Prisma fills `@updatedAt` client-side on every update, and
 * a bump would move a just-starred collection to the top of every
 * updatedAt-sorted list (dashboard grid, sidebar Recent, /collections) and
 * change the "Updated" date /favorites shows. There is no DB trigger, so a
 * raw UPDATE leaves the column alone.
 *
 * Ownership is in the WHERE clause, so another user's id and a missing one
 * both match zero rows — the caller can't tell them apart.
 */

/** Sets an item's favorite flag. False when no item of the user's matched. */
export async function setItemFavorite(
  userId: string,
  id: string,
  isFavorite: boolean,
): Promise<boolean> {
  const count = await prisma.$executeRaw`
    UPDATE "Item" SET "isFavorite" = ${isFavorite}
    WHERE "id" = ${id} AND "userId" = ${userId}`;
  return count > 0;
}

/** Sets a collection's favorite flag. False when no collection matched. */
export async function setCollectionFavorite(
  userId: string,
  id: string,
  isFavorite: boolean,
): Promise<boolean> {
  const count = await prisma.$executeRaw`
    UPDATE "Collection" SET "isFavorite" = ${isFavorite}
    WHERE "id" = ${id} AND "userId" = ${userId}`;
  return count > 0;
}
