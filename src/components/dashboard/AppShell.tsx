import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { EditorPreferencesProvider } from "@/components/editor/EditorPreferencesProvider";
import { ItemDrawerProvider } from "@/components/items/ItemDrawerProvider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  getCollectionOptions,
  getFavoriteCollections,
  getRecentNonFavoriteCollections,
} from "@/lib/db/collections";
import { getPlanUsage } from "@/lib/db/entitlements";
import {
  getCreatableItemTypes,
  getItemTypeNavItems,
} from "@/lib/db/item-types";
import { requireUserId } from "@/lib/db/session-user";
import { getCurrentUser, getEditorPreferences } from "@/lib/db/users";
import { checkProFeature } from "@/lib/entitlements";
import { PRO_TYPE_NAMES } from "@/lib/system-types";

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
    creatableTypes,
    collectionOptions,
    editorPreferences,
    plan,
  ] = await Promise.all([
    getItemTypeNavItems(userId),
    getFavoriteCollections(userId),
    getRecentNonFavoriteCollections(userId),
    getCurrentUser(userId),
    getCreatableItemTypes(),
    getCollectionOptions(userId),
    getEditorPreferences(userId),
    getPlanUsage(userId),
  ]);

  // Signed in against a User row that no longer exists — clear the stale
  // JWT rather than crashing on every render.
  if (!user || !plan) redirect("/api/auth/session-expired");

  // A courtesy only — createItem and the upload route make the real decision
  const proAccess = checkProFeature(plan);
  const newItemTypes = creatableTypes.map((type) => ({
    ...type,
    locked: PRO_TYPE_NAMES.has(type.name) && !proAccess,
  }));

  return (
    <TooltipProvider>
      <EditorPreferencesProvider initialPreferences={editorPreferences}>
        <SidebarProvider>
          <AppSidebar
            itemTypes={itemTypes}
            favoriteCollections={favoriteCollections}
            recentCollections={recentCollections}
            user={user}
          />
          <SidebarInset className="h-svh overflow-hidden">
            <ItemDrawerProvider collectionOptions={collectionOptions}>
              <TopBar
                newItemTypes={newItemTypes}
                collectionOptions={collectionOptions}
              />
              <div className="flex-1 overflow-y-auto p-6">{children}</div>
            </ItemDrawerProvider>
          </SidebarInset>
        </SidebarProvider>
      </EditorPreferencesProvider>
    </TooltipProvider>
  );
}
