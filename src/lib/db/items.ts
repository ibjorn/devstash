import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import type {
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
