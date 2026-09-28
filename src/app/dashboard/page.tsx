import Link from "next/link";
import { Folder, Layers, Pin } from "lucide-react";

import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ItemRow } from "@/components/dashboard/ItemRow";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { getRecentCollections } from "@/lib/db/collections";
import { getDashboardStats } from "@/lib/db/dashboard";
import { getPinnedItems, getRecentItems } from "@/lib/db/items";
import { requireUserId } from "@/lib/db/session-user";

// Render per request — collections, items, and stats come from the database
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await requireUserId();
  const [collections, pinnedItems, recentItems, stats] = await Promise.all([
    getRecentCollections(userId),
    getPinnedItems(userId),
    getRecentItems(userId),
    getDashboardStats(userId),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your developer knowledge hub
        </p>
      </div>

      <StatsCards stats={stats} />

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Collections</h2>
          <Link
            href="/collections"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </div>
        {collections.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Folder}
            title="No collections yet"
            description="Collections group related items together — a snippet can live in several at once."
          />
        )}
      </section>

      {pinnedItems.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Pin className="size-4 text-muted-foreground" />
            Pinned
          </h2>
          <div className="flex flex-col gap-3">
            {pinnedItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Recent</h2>
        {recentItems.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Layers}
            title="No items yet"
            description="Snippets, prompts, commands, notes and links you save will show up here."
          />
        )}
      </section>
    </div>
  );
}
