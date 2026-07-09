"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Folder, FolderOpen, Layers, Star } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { getTypeIcon } from "@/lib/type-icons";
import type { CollectionSummary } from "@/types/collections";
import type { ItemTypeNavItem } from "@/types/items";
import type { CurrentUser } from "@/types/users";

function getInitials(user: CurrentUser) {
  return (user.name ?? user.email)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  const pathname = usePathname();
  const displayName = user.name ?? user.email;

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
          <SidebarGroupLabel>Types</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {itemTypes.map((type) => {
                const Icon = getTypeIcon(type.icon);
                const href = `/items/${type.slug}`;
                return (
                  <SidebarMenuItem key={type.id}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === href}
                      tooltip={type.name}
                    >
                      <Link href={href}>
                        {/* data-driven color from the item type, can't be a static class */}
                        <Icon style={{ color: type.color }} />
                        <span>{type.name}</span>
                        {type.isPro && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground"
                          >
                            PRO
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{type.count}</SidebarMenuBadge>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Favorites</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {favoriteCollections.map((collection) => (
                <SidebarMenuItem key={collection.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/collections/${collection.id}`}
                    tooltip={collection.name}
                  >
                    <Link href={`/collections/${collection.id}`}>
                      <Folder />
                      <span>{collection.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>
                    <Star className="size-3 fill-yellow-400 text-yellow-400" />
                  </SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {recentCollections.map((collection) => (
                <SidebarMenuItem key={collection.id}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === `/collections/${collection.id}`}
                    tooltip={collection.name}
                  >
                    <Link href={`/collections/${collection.id}`}>
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        {/* dot tinted by the collection's most-used item type */}
                        <span
                          className="size-2.5 rounded-full"
                          style={{
                            backgroundColor:
                              collection.types[0]?.color ?? "#6b7280",
                          }}
                        />
                      </span>
                      <span>{collection.name}</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>{collection.itemCount}</SidebarMenuBadge>
                </SidebarMenuItem>
              ))}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/collections"}
                  tooltip="View all collections"
                >
                  <Link
                    href="/collections"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <FolderOpen />
                    <span>View all collections</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={displayName}>
              <Avatar className="size-8">
                <AvatarFallback>{getInitials(user)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
