"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
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
  const pathname = usePathname();
  const href = `/collections/${collection.id}`;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={pathname === href}
        tooltip={collection.name}
      >
        <Link href={href}>
          {icon}
          <span>{collection.name}</span>
        </Link>
      </SidebarMenuButton>
      <SidebarMenuBadge>{badge}</SidebarMenuBadge>
    </SidebarMenuItem>
  );
}
