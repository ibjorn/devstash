import type { Metadata } from "next";
import { Folder } from "lucide-react";

import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { getAllCollections } from "@/lib/db/collections";
import { requireUserId } from "@/lib/db/session-user";

// Render per request — collections come from the database
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Collections · DevStash" };

export default async function CollectionsPage() {
  const userId = await requireUserId();
  const collections = await getAllCollections(userId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Collections</h1>
        <p className="text-sm text-muted-foreground">
          {collections.length}{" "}
          {collections.length === 1 ? "collection" : "collections"}
        </p>
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
    </div>
  );
}
