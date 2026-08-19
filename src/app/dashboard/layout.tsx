import { redirect } from "next/navigation";

import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  getFavoriteCollections,
  getRecentNonFavoriteCollections,
} from "@/lib/db/collections";
import { getItemTypeNavItems } from "@/lib/db/items";
import { requireUserId } from "@/lib/db/session-user";
import { getCurrentUser } from "@/lib/db/users";

// Render per request — sidebar types and collections come from the database
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const userId = await requireUserId();
  const [itemTypes, favoriteCollections, recentCollections, user] =
    await Promise.all([
      getItemTypeNavItems(userId),
      getFavoriteCollections(userId),
      getRecentNonFavoriteCollections(userId),
      getCurrentUser(userId),
    ]);

  // Signed in against a User row that no longer exists — clear the stale
  // JWT rather than crashing on every dashboard render.
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
          <TopBar />
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
