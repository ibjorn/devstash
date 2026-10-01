import type { Metadata } from "next";
import { Star } from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { FavoritesList } from "@/components/favorites/FavoritesList";
import { getFavoriteCollectionList } from "@/lib/db/collections";
import { getFavoriteItems } from "@/lib/db/items";
import { requireUserId } from "@/lib/db/session-user";

// Render per request — favorites come from the database
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Favorites · DevStash" };

export default async function FavoritesPage() {
  const userId = await requireUserId();
  const [items, collections] = await Promise.all([
    getFavoriteItems(userId),
    getFavoriteCollectionList(userId),
  ]);
  const isEmpty = items.length === 0 && collections.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Favorites</h1>
        <p className="text-sm text-muted-foreground">
          Starred items and collections
        </p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Star}
          title="No favorites yet"
          description="Items and collections you star will show up here."
        />
      ) : (
        <FavoritesList items={items} collections={collections} />
      )}
    </div>
  );
}
