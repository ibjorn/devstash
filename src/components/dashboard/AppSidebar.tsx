"use client";

import Link from "next/link";
import {
  Folder,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Star,
} from "lucide-react";

import {
  CollectionDot,
  CollectionNavItem,
} from "@/components/dashboard/CollectionNavItem";
import { NavLinkItem } from "@/components/dashboard/NavLinkItem";
import { SidebarUserMenu } from "@/components/dashboard/SidebarUserMenu";
import { FavoriteStar } from "@/components/favorites/FavoriteStar";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getTypeIcon } from "@/lib/type-icons";
import type { CollectionSummary } from "@/types/collections";
import type { ItemTypeNavItem } from "@/types/items";
import type { CurrentUser } from "@/types/users";

const MAIN_LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/favorites", label: "Favorites", icon: Star },
];

function ProBadge() {
  return (
    <Badge
      variant="outline"
      className="h-4 px-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground"
    >
      PRO
    </Badge>
  );
}

interface AppSidebarProps {
  itemTypes: ItemTypeNavItem[];
  favoriteCollections: CollectionSummary[];
  recentCollections: CollectionSummary[];
  user: CurrentUser;
}

export function AppSidebar({
  itemTypes,
  favoriteCollections,
  recentCollections,
  user,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Layers className="size-4" />
                </div>
                <span className="font-semibold">DevStash</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {MAIN_LINKS.map(({ href, label, icon: Icon }) => (
                <NavLinkItem
                  key={href}
                  href={href}
                  label={label}
                  icon={<Icon />}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Types</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itemTypes.map((type) => {
                const Icon = getTypeIcon(type.icon);
                return (
                  <NavLinkItem
                    key={type.id}
                    href={`/items/${type.slug}`}
                    label={type.name}
                    // data-driven color from the item type, can't be a static class
                    icon={<Icon style={{ color: type.color }} />}
                    badge={type.count}
                  >
                    {type.isPro && <ProBadge />}
                  </NavLinkItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {/* hidden entirely when empty — a bare "Favorites" heading is just noise */}
        {favoriteCollections.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Favorites</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {favoriteCollections.map((collection) => (
                  <CollectionNavItem
                    key={collection.id}
                    collection={collection}
                    icon={<Folder />}
                    badge={<FavoriteStar className="size-3" />}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recentCollections.length === 0 && (
                // plain text, so it hides with the labels in the icon rail
                <li className="px-2 py-1.5 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                  No collections yet
                </li>
              )}
              {recentCollections.map((collection) => (
                <CollectionNavItem
                  key={collection.id}
                  collection={collection}
                  icon={<CollectionDot collection={collection} />}
                  badge={collection.itemCount}
                />
              ))}
              <NavLinkItem
                href="/collections"
                label="View all collections"
                icon={<FolderOpen />}
                // exact: each collection page lights its own entry instead
                exact
                linkClassName="text-muted-foreground hover:text-foreground"
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarUserMenu user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
