import type { Metadata } from "next";
import { Star } from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { FavoriteCollectionRow } from "@/components/favorites/FavoriteCollectionRow";
import { FavoriteItemRow } from "@/components/favorites/FavoriteItemRow";
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
          Starred items and collections, most recently updated first
        </p>
      </div>

      {isEmpty ? (
        <EmptyState
          icon={Star}
          title="No favorites yet"
          description="Items and collections you star will show up here."
        />
      ) : (
        <div className="flex flex-col gap-6 font-mono text-sm">
          <FavoritesSection title="Items" count={items.length}>
            {items.map((item) => (
              <FavoriteItemRow key={item.id} item={item} />
            ))}
          </FavoritesSection>
          <FavoritesSection title="Collections" count={collections.length}>
            {collections.map((collection) => (
              <FavoriteCollectionRow
                key={collection.id}
                collection={collection}
              />
            ))}
          </FavoritesSection>
        </div>
      )}
    </div>
  );
}

interface FavoritesSectionProps {
  title: string;
  count: number;
  children: React.ReactNode;
}

function FavoritesSection({ title, count, children }: FavoritesSectionProps) {
  return (
    <section aria-label={title}>
      <h2 className="border-b px-3 pb-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title} <span className="tabular-nums">({count})</span>
      </h2>
      {count > 0 ? (
        <ul className="divide-y divide-border/50">{children}</ul>
      ) : (
        <p className="px-3 py-1.5 text-muted-foreground">
          No favorite {title.toLowerCase()}.
        </p>
      )}
    </section>
  );
}
