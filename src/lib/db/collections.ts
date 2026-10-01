import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  CollectionHeader,
  CollectionOption,
  CollectionSummary,
  CollectionTypeStat,
} from "@/types/collections";

async function findCollectionSummaries(
  userId: string,
  where: Prisma.CollectionWhereInput,
  limit?: number
): Promise<CollectionSummary[]> {
  const collections = await prisma.collection.findMany({
    where: { userId, ...where },
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

export async function getRecentCollections(
  userId: string,
  limit = 6
): Promise<CollectionSummary[]> {
  return findCollectionSummaries(userId, {}, limit);
}

export async function getFavoriteCollections(
  userId: string,
  limit = 5
): Promise<CollectionSummary[]> {
  return findCollectionSummaries(userId, { isFavorite: true }, limit);
}

// Sidebar "Recent" group; favorites are excluded since they have their own group
export async function getRecentNonFavoriteCollections(
  userId: string,
  limit = 5
): Promise<CollectionSummary[]> {
  return findCollectionSummaries(userId, { isFavorite: false }, limit);
}

/**
 * Every collection the user owns, newest activity first, for /collections.
 * Unbounded: a page that promises all collections shouldn't truncate them.
 */
export async function getAllCollections(
  userId: string,
): Promise<CollectionSummary[]> {
  return findCollectionSummaries(userId, {});
}

/**
 * One collection's header fields for /collections/[id]. Ownership is part of
 * the where clause, so another user's id and a nonexistent one both give null.
 */
export async function getCollectionHeader(
  userId: string,
  id: string,
): Promise<CollectionHeader | null> {
  return prisma.collection.findFirst({
    where: { id, userId },
    select: { id: true, name: true, description: true, isFavorite: true },
  });
}

/**
 * Every collection the user owns, for the item forms' picker. Unbounded on
 * purpose: a picker that silently hides some collections can't be used to
 * add an item to them. Alphabetical, so a name is easy to find by eye.
 */
export async function getCollectionOptions(
  userId: string,
): Promise<CollectionOption[]> {
  return prisma.collection.findMany({
    where: { userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export interface CreateCollectionData {
  name: string;
  description: string | null;
}

// A brand-new collection has no items, so its summary needs no type stats
export async function createCollection(
  userId: string,
  data: CreateCollectionData,
): Promise<CollectionSummary> {
  const collection = await prisma.collection.create({
    data: { userId, name: data.name, description: data.description },
    select: { id: true, name: true, description: true, isFavorite: true },
  });

  return { ...collection, itemCount: 0, types: [] };
}

/**
 * Edits a collection's metadata. Ownership is part of the update's where
 * clause, so another user's id raises P2025 exactly as a missing one does.
 */
export async function updateCollection(
  userId: string,
  id: string,
  data: CreateCollectionData,
): Promise<CollectionHeader> {
  return prisma.collection.update({
    where: { id, userId },
    data: { name: data.name, description: data.description },
    select: { id: true, name: true, description: true, isFavorite: true },
  });
}

/**
 * Deletes a collection, scoped to its owner like `updateCollection`. Its items
 * are kept: ItemCollection cascades on the collection side only, so just the
 * membership rows go.
 */
export async function deleteCollection(
  userId: string,
  id: string,
): Promise<void> {
  await prisma.collection.delete({
    where: { id, userId },
    select: { id: true },
  });
}
