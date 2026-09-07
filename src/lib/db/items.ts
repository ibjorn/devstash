import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  ItemDetail,
  ItemSummary,
  ItemTypeListing,
  ItemTypeNavItem,
} from "@/types/items";

// Display order for system types; the table has no sort column
const SYSTEM_TYPE_ORDER = [
  "Snippet",
  "Prompt",
  "Command",
  "Note",
  "File",
  "Image",
  "Link",
];

// Pro-only system types, keyed by singular name
const PRO_TYPE_NAMES = new Set(["File", "Image"]);

const itemSummarySelect = {
  id: true,
  title: true,
  description: true,
  isFavorite: true,
  isPinned: true,
  createdAt: true,
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
  };
}

export async function getItemTypeNavItems(
  userId: string
): Promise<ItemTypeNavItem[]> {
  const types = await prisma.itemType.findMany({
    where: { isSystem: true },
    select: {
      id: true,
      name: true,
      icon: true,
      color: true,
      _count: {
        select: { items: { where: { userId } } },
      },
    },
  });

  const orderOf = (name: string) => {
    const index = SYSTEM_TYPE_ORDER.indexOf(name);
    return index === -1 ? SYSTEM_TYPE_ORDER.length : index;
  };

  return types
    .sort((a, b) => orderOf(a.name) - orderOf(b.name))
    .map((type) => {
      // All system type names pluralize regularly ("Snippet" -> "Snippets")
      const plural = `${type.name}s`;
      return {
        id: type.id,
        name: plural,
        slug: plural.toLowerCase(),
        icon: type.icon,
        color: type.color,
        count: type._count.items,
        isPro: PRO_TYPE_NAMES.has(type.name),
      };
    });
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

// "snippets" -> "snippet". Mirrors the pluralization getItemTypeNavItems uses
// to build the slugs the sidebar links to; all system type names are regular.
// Lowercased first so the trailing "s" is stripped whatever case the URL used
// — the name match below is case-insensitive, and this has to agree with it.
function singularFromSlug(slug: string): string {
  const normalized = slug.toLowerCase();
  return normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
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
  fileName: true,
  fileSize: true,
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
    fileName: item.fileName,
    fileSize: item.fileSize,
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

/**
 * Apply an edit from the drawer and return the item as it now stands, so the
 * caller can repaint without a second fetch.
 *
 * `userId` sits in the update's own where clause rather than being checked
 * beforehand: a row belonging to someone else simply matches nothing, and
 * Prisma raises P2025 exactly as it does for an id that never existed.
 *
 * Tags are replaced wholesale — every existing link is dropped and the new set
 * connected or created. Tag rows are per-user, so `userId_name` is the unique
 * one user's vocabulary is keyed on and a name another user already holds is a
 * different row entirely.
 */
export async function updateItem(
  userId: string,
  id: string,
  data: UpdateItemData,
): Promise<ItemDetail> {
  const item = await prisma.item.update({
    where: { id, userId },
    data: {
      title: data.title,
      description: data.description,
      content: data.content,
      url: data.url,
      language: data.language,
      tags: {
        set: [],
        connectOrCreate: data.tags.map((name) => ({
          where: { userId_name: { userId, name } },
          create: { name, userId },
        })),
      },
    },
    select: itemDetailSelect,
  });

  return toItemDetail(item);
}
