import type { ItemContentType, Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { pluralTypeName, typeSlug } from "@/lib/type-names";
import type { CreatableItemType, ItemTypeNavItem } from "@/types/items";

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

// ItemType has no contentType column — it lives on each Item — so a new item's
// is decided by its system type here. Anything not listed stores text.
const SYSTEM_TYPE_CONTENT: Record<string, ItemContentType> = {
  Link: "URL",
  File: "FILE",
  Image: "FILE",
};

function contentTypeFor(typeName: string): ItemContentType {
  return SYSTEM_TYPE_CONTENT[typeName] ?? "TEXT";
}

function systemTypeOrder(name: string): number {
  const index = SYSTEM_TYPE_ORDER.indexOf(name);
  return index === -1 ? SYSTEM_TYPE_ORDER.length : index;
}

export async function getItemTypeNavItems(
  userId: string,
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

  return types
    .sort((a, b) => systemTypeOrder(a.name) - systemTypeOrder(b.name))
    .map((type) => ({
      id: type.id,
      name: pluralTypeName(type.name),
      slug: typeSlug(type.name),
      icon: type.icon,
      color: type.color,
      count: type._count.items,
      isPro: PRO_TYPE_NAMES.has(type.name),
    }));
}

// Every system type, File and Image included: they're Pro-only, but Pro gating
// stays bypassed during development (see the project overview), so they're
// only badged in the sidebar for now. Custom types join this list when they
// ship.
const creatableTypeWhere = {
  isSystem: true,
} satisfies Prisma.ItemTypeWhereInput;

const creatableTypeSelect = {
  id: true,
  name: true,
  icon: true,
  color: true,
} satisfies Prisma.ItemTypeSelect;

type CreatableTypeRow = Prisma.ItemTypeGetPayload<{
  select: typeof creatableTypeSelect;
}>;

function toCreatableItemType(type: CreatableTypeRow): CreatableItemType {
  return {
    ...type,
    slug: typeSlug(type.name),
    contentType: contentTypeFor(type.name),
  };
}

/** The types the New Item dialog offers, in sidebar order. */
export async function getCreatableItemTypes(): Promise<CreatableItemType[]> {
  const types = await prisma.itemType.findMany({
    where: creatableTypeWhere,
    select: creatableTypeSelect,
  });

  return types
    .sort((a, b) => systemTypeOrder(a.name) - systemTypeOrder(b.name))
    .map(toCreatableItemType);
}

/**
 * Resolve a type id a caller wants to create an item with. Returns null for
 * anything the dialog wouldn't have offered — an unknown id or another user's
 * custom type — so the id is never trusted as sent.
 */
export async function getCreatableItemType(
  id: string,
): Promise<CreatableItemType | null> {
  const type = await prisma.itemType.findFirst({
    where: { id, ...creatableTypeWhere },
    select: creatableTypeSelect,
  });

  return type ? toCreatableItemType(type) : null;
}
