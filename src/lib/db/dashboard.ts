import { prisma } from "@/lib/prisma";
import type { DashboardStats } from "@/types/dashboard";

export async function getDashboardStats(
  userId: string
): Promise<DashboardStats> {
  const owner = { userId };

  const [items, collections, favoriteItems, favoriteCollections] =
    await Promise.all([
      prisma.item.count({ where: owner }),
      prisma.collection.count({ where: owner }),
      prisma.item.count({ where: { ...owner, isFavorite: true } }),
      prisma.collection.count({ where: { ...owner, isFavorite: true } }),
    ]);

  return { items, collections, favoriteItems, favoriteCollections };
}
