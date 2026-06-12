import { prisma } from "@/lib/prisma";
import type {
  CollectionSummary,
  CollectionTypeStat,
} from "@/types/collections";

// Auth isn't wired up yet, so queries are scoped to the seeded demo user
const DEMO_USER_EMAIL = "demo@devstash.io";

export async function getRecentCollections(
  limit = 6
): Promise<CollectionSummary[]> {
  const collections = await prisma.collection.findMany({
    where: { user: { email: DEMO_USER_EMAIL } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      items: {
        select: {
          item: {
            select: {
              itemType: {
                select: { id: true, name: true, icon: true, color: true },
              },
            },
          },
        },
      },
    },
  });

  // Empty collections fall back to their defaultTypeId for the card color
  const fallbackTypeIds = collections.flatMap((collection) =>
    collection.items.length === 0 && collection.defaultTypeId
      ? [collection.defaultTypeId]
      : []
  );
  const fallbackTypes = fallbackTypeIds.length
    ? await prisma.itemType.findMany({
        where: { id: { in: fallbackTypeIds } },
        select: { id: true, name: true, icon: true, color: true },
      })
    : [];
  const fallbackTypeById = new Map(fallbackTypes.map((type) => [type.id, type]));

  return collections.map((collection) => {
    const typeStats = new Map<string, CollectionTypeStat>();
    for (const { item } of collection.items) {
      const stat = typeStats.get(item.itemType.id);
      if (stat) {
        stat.count += 1;
      } else {
        typeStats.set(item.itemType.id, { ...item.itemType, count: 1 });
      }
    }

    const types = [...typeStats.values()].sort((a, b) => b.count - a.count);
    if (types.length === 0 && collection.defaultTypeId) {
      const fallback = fallbackTypeById.get(collection.defaultTypeId);
      if (fallback) types.push({ ...fallback, count: 0 });
    }

    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      isFavorite: collection.isFavorite,
      itemCount: collection.items.length,
      types,
    };
  });
}
