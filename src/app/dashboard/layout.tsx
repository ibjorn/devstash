import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { TopBar } from "@/components/dashboard/TopBar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  getFavoriteCollections,
  getRecentNonFavoriteCollections,
} from "@/lib/db/collections";
import { getItemTypeNavItems } from "@/lib/db/items";

// Render per request — sidebar types and collections come from the database
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [itemTypes, favoriteCollections, recentCollections] =
    await Promise.all([
      getItemTypeNavItems(),
      getFavoriteCollections(),
      getRecentNonFavoriteCollections(),
    ]);

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          itemTypes={itemTypes}
          favoriteCollections={favoriteCollections}
          recentCollections={recentCollections}
        />
        <SidebarInset className="h-svh overflow-hidden">
          <TopBar />
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
