import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { ItemDrawerProvider } from "@/components/items/ItemDrawerProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  getFavoriteCollections,
  getRecentNonFavoriteCollections,
} from "@/lib/db/collections";
import {
  getCreatableItemTypes,
  getItemTypeNavItems,
} from "@/lib/db/item-types";
import { requireUserId } from "@/lib/db/session-user";
import { getCurrentUser } from "@/lib/db/users";

/**
 * The signed-in chrome: sidebar, top bar, and the queries that feed them.
 *
 * /dashboard and /profile are separate route trees with their own layouts, so
 * this lives in a component both can render rather than being copied into each
 * — the stale-session redirect below is easy to leave out of a second copy.
 */
export async function AppShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const userId = await requireUserId();
  const [
    itemTypes,
    favoriteCollections,
    recentCollections,
    user,
    newItemTypes,
  ] = await Promise.all([
    getItemTypeNavItems(userId),
    getFavoriteCollections(userId),
    getRecentNonFavoriteCollections(userId),
    getCurrentUser(userId),
    getCreatableItemTypes(),
  ]);

  // Signed in against a User row that no longer exists — clear the stale
  // JWT rather than crashing on every render.
  if (!user) redirect("/api/auth/session-expired");

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          itemTypes={itemTypes}
          favoriteCollections={favoriteCollections}
          recentCollections={recentCollections}
          user={user}
        />
        <SidebarInset className="h-svh overflow-hidden">
          <ItemDrawerProvider>
            <TopBar newItemTypes={newItemTypes} />
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </ItemDrawerProvider>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
