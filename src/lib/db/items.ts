import type { ItemContentType, Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { singularFromSlug } from "@/lib/type-names";
import type { ItemDetail, ItemSummary, ItemTypeListing } from "@/types/items";

const itemSummarySelect = {
  id: true,
  title: true,
  description: true,
  isFavorite: true,
  isPinned: true,
  createdAt: true,
  fileName: true,
  fileSize: true,
  itemType: { select: { id: true, name: true, icon: true, color: true } },
  tags: { select: { name: true }, orderBy: { name: "asc" } },
} satisfies Prisma.ItemSelect;

type ItemSummaryRow = Prisma.ItemGetPayload<{ select: typeof itemSummarySelect }>;

function toItemSummary(item: ItemSummaryRow): ItemSummary {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    isFavorite: item.isFavorite,
    isPinned: item.isPinned,
    createdAt: item.createdAt,
    type: item.itemType,
    tags: item.tags.map((tag) => tag.name),
    fileName: item.fileName,
    fileSize: item.fileSize,
  };
}

export async function getPinnedItems(
  userId: string,
  limit = 10
): Promise<ItemSummary[]> {
  const items = await prisma.item.findMany({
    where: { userId, isPinned: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: itemSummarySelect,
  });

  return items.map(toItemSummary);
}

export async function getRecentItems(
  userId: string,
  limit = 10
): Promise<ItemSummary[]> {
  const items = await prisma.item.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: itemSummarySelect,
  });

  return items.map(toItemSummary);
}

/**
 * Items of one type for /items/[type], newest first with pinned items on top.
 *
 * Resolves the slug against the system types and the user's own custom types.
 * An unrecognized slug returns `{ type: null, items: [] }` rather than throwing
 * — the page renders an empty state for it.
 */
export async function getItemsByTypeSlug(
  userId: string,
  slug: string
): Promise<ItemTypeListing> {
  const type = await prisma.itemType.findFirst({
    where: {
      name: { equals: singularFromSlug(slug), mode: "insensitive" },
      OR: [{ isSystem: true }, { userId }],
    },
    // A user's own type could share a name with a system one; the sidebar
    // links to the system slugs, so let those win rather than leaving it to
    // findFirst's arbitrary pick
    orderBy: { isSystem: "desc" },
    select: { id: true, name: true, icon: true, color: true },
  });

  if (!type) return { type: null, items: [] };

  const items = await prisma.item.findMany({
    where: { userId, itemTypeId: type.id },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    select: itemSummarySelect,
  });

  return { type, items: items.map(toItemSummary) };
}

const itemDetailSelect = {
  ...itemSummarySelect,
  content: true,
  contentType: true,
  url: true,
  fileUrl: true,
  language: true,
  updatedAt: true,
  collections: {
    select: { collection: { select: { id: true, name: true } } },
    orderBy: { collection: { name: "asc" } },
  },
} satisfies Prisma.ItemSelect;

/**
 * One item in full, for the drawer. Scoped by userId in the same query rather
 * than fetched and checked afterwards, so another user's id is indistinguishable
 * from one that doesn't exist — both come back null and the route 404s.
 */
export async function getItemDetail(
  userId: string,
  id: string,
): Promise<ItemDetail | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: itemDetailSelect,
  });

  if (!item) return null;

  return toItemDetail(item);
}

type ItemDetailRow = Prisma.ItemGetPayload<{ select: typeof itemDetailSelect }>;

function toItemDetail(item: ItemDetailRow): ItemDetail {
  return {
    ...toItemSummary(item),
    content: item.content,
    contentType: item.contentType,
    url: item.url,
    fileUrl: item.fileUrl,
    language: item.language,
    updatedAt: item.updatedAt,
    collections: item.collections.map((link) => link.collection),
  };
}

export interface UpdateItemData {
  title: string;
  description: string | null;
  content: string | null;
  url: string | null;
  language: string | null;
  tags: string[];
}

type TransactionClient = Parameters<
  Parameters<typeof prisma.$transaction>[0]
>[0];

/**
 * Connect an item to the user's tags by name, creating any that don't exist.
 * Tag rows are per-user, so `userId_name` is the unique one user's vocabulary
 * is keyed on — a name another user already holds is a different row.
 */
function connectUserTags(userId: string, names: string[]) {
  return {
    connectOrCreate: names.map((name) => ({
      where: { userId_name: { userId, name } },
      create: { name, userId },
    })),
  } satisfies Prisma.TagCreateNestedManyWithoutItemsInput;
}

/**
 * Delete the user's tags that no item references any more. Tags only exist to
 * label items, so an unreferenced one is dead weight — and scoped to one user,
 * it can't race anyone else's save now that tags are per-user.
 */
async function sweepOrphanTags(tx: TransactionClient, userId: string) {
  await tx.tag.deleteMany({ where: { userId, items: { none: {} } } });
}

/**
 * Apply an edit from the drawer and return the item as it now stands, so the
 * caller can repaint without a second fetch.
 *
 * `userId` sits in the update's own where clause rather than being checked
 * beforehand: a row belonging to someone else simply matches nothing, and
 * Prisma raises P2025 exactly as it does for an id that never existed.
 *
 * Tags are replaced wholesale — every existing link is dropped and the new set
 * connected or created per user. Tags the edit leaves unused are swept in the
 * same transaction.
 */
export async function updateItem(
  userId: string,
  id: string,
  data: UpdateItemData,
): Promise<ItemDetail> {
  const item = await prisma.$transaction(async (tx) => {
    const updated = await tx.item.update({
      where: { id, userId },
      data: {
        title: data.title,
        description: data.description,
        content: data.content,
        url: data.url,
        language: data.language,
        tags: { set: [], ...connectUserTags(userId, data.tags) },
      },
      select: itemDetailSelect,
    });
    await sweepOrphanTags(tx, userId);
    return updated;
  });

  return toItemDetail(item);
}

/**
 * Delete one of the user's items, returning the R2 key of its file (null for
 * anything that isn't a File or Image) so the caller can remove the object.
 *
 * As with `updateItem`, ownership lives in the delete's own where clause: a row
 * belonging to someone else matches nothing and raises P2025, the same as an id
 * that never existed. Collection and tag links cascade with the item; any tag
 * this leaves unused is swept in the same transaction.
 */
export async function deleteItem(
  userId: string,
  id: string,
): Promise<{ fileKey: string | null }> {
  return prisma.$transaction(async (tx) => {
    const deleted = await tx.item.delete({
      where: { id, userId },
      select: { fileUrl: true },
    });
    await sweepOrphanTags(tx, userId);
    return { fileKey: deleted.fileUrl };
  });
}

/**
 * Whether one of the user's items already points at this object. Two items
 * sharing a key would mean deleting either removes the other's file.
 */
export async function isFileKeyInUse(
  userId: string,
  key: string,
): Promise<boolean> {
  const item = await prisma.item.findFirst({
    where: { userId, fileUrl: key },
    select: { id: true },
  });
  return item !== null;
}

/**
 * The stored file behind one of the user's items, for the download proxy.
 * Scoped by userId in the query, like getItemDetail, so another user's item
 * and a missing one are the same null.
 */
export async function getItemFile(
  userId: string,
  id: string,
): Promise<{ key: string; fileName: string } | null> {
  const item = await prisma.item.findFirst({
    where: { id, userId },
    select: { fileUrl: true, fileName: true },
  });

  if (!item?.fileUrl || !item.fileName) return null;
  return { key: item.fileUrl, fileName: item.fileName };
}

export interface CreateItemData extends UpdateItemData {
  itemTypeId: string;
  contentType: ItemContentType;
  // Set together for File and Image items, null for everything else. fileUrl
  // holds the private R2 object key, not a URL anyone can fetch — files are
  // only ever served through the owner-checked proxy.
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
}

/**
 * Create an item for the user and return it in full, so the drawer can open on
 * it without a fetch. Tags are connected or created per user on `userId_name`,
 * exactly as `updateItem` does — a name another user holds is a different row.
 */
export async function createItem(
  userId: string,
  data: CreateItemData,
): Promise<ItemDetail> {
  const item = await prisma.item.create({
    data: {
      userId,
      itemTypeId: data.itemTypeId,
      contentType: data.contentType,
      title: data.title,
      description: data.description,
      content: data.content,
      url: data.url,
      language: data.language,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      tags: connectUserTags(userId, data.tags),
    },
    select: itemDetailSelect,
  });

  return toItemDetail(item);
}
