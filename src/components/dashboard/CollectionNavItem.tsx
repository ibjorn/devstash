"use client";

import { NavLinkItem } from "@/components/dashboard/NavLinkItem";
import type { CollectionSummary } from "@/types/collections";

interface CollectionNavItemProps {
  collection: CollectionSummary;
  /** Leading glyph: a folder icon, or the recents' type-tinted dot. */
  icon: React.ReactNode;
  /** Trailing badge: the favourite star, or the item count. */
  badge: React.ReactNode;
}

/** One collection link in the sidebar's Favorites or Recent group. */
export function CollectionNavItem({
  collection,
  icon,
  badge,
}: CollectionNavItemProps) {
  return (
    <NavLinkItem
      href={`/collections/${collection.id}`}
      label={collection.name}
      icon={icon}
      badge={badge}
    />
  );
}

/** The recents' dot, tinted by the collection's most-used item type. */
export function CollectionDot({ collection }: { collection: CollectionSummary }) {
  return (
    <span className="flex size-4 shrink-0 items-center justify-center">
      {/* data-driven color, can't be a static class */}
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: collection.types[0]?.color ?? "#6b7280" }}
      />
    </span>
  );
}
