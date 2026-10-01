import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { FolderOpen, Star } from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { FileRow } from "@/components/items/FileRow";
import { ImageCard } from "@/components/items/ImageCard";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import { groupCollectionItems } from "@/lib/collection-items";
import { getCollectionHeader } from "@/lib/db/collections";
import { getItemsInCollection } from "@/lib/db/items";
import { requireUserId } from "@/lib/db/session-user";
import { pluralTypeName } from "@/lib/type-names";
import type { ItemSummary } from "@/types/items";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
}

// Render per request — the collection and its items come from the database
export const dynamic = "force-dynamic";

// The metadata and the page both need the header; fetch it once per request
const loadCollectionHeader = cache(getCollectionHeader);

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { id } = await params;
  const collection = await loadCollectionHeader(await requireUserId(), id);
  return { title: `${collection?.name ?? "Collection"} · DevStash` };
}

interface UploadSectionProps {
  // Non-empty; the first item's type supplies the heading and icon
  items: ItemSummary[];
  children: React.ReactNode;
}

function UploadSection({ items, children }: UploadSectionProps) {
  const type = items[0].type;

  return (
    <section className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <ItemTypeIcon type={type} size="sm" />
        {pluralTypeName(type.name)}
      </h2>
      {children}
    </section>
  );
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { id } = await params;
  const userId = await requireUserId();
  // Both queries are scoped to the user, so running them together can't leak
  // items from a collection that turns out not to be theirs
  const [collection, items] = await Promise.all([
    loadCollectionHeader(userId, id),
    getItemsInCollection(userId, id),
  ]);

  // Another user's collection and a nonexistent one look the same
  if (!collection) notFound();

  const { cards, images, files } = groupCollectionItems(items);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <span className="truncate">{collection.name}</span>
          {collection.isFavorite && (
            <Star className="size-4 shrink-0 fill-yellow-400 text-yellow-400" />
          )}
        </h1>
        {collection.description && (
          <p className="text-muted-foreground">{collection.description}</p>
        )}
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "item" : "items"}
        </p>
      </div>

      {items.length > 0 ? (
        <>
          {cards.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {cards.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
          {/* Images and files display as they do on their own type pages */}
          {images.length > 0 && (
            <UploadSection items={images}>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {images.map((item) => (
                  <ImageCard key={item.id} item={item} />
                ))}
              </div>
            </UploadSection>
          )}
          {files.length > 0 && (
            <UploadSection items={files}>
              <ul className="divide-y overflow-hidden rounded-xl border bg-card">
                {files.map((item) => (
                  <FileRow key={item.id} item={item} />
                ))}
              </ul>
            </UploadSection>
          )}
        </>
      ) : (
        <EmptyState
          icon={FolderOpen}
          title="This collection is empty"
          description="Add an item to it from the item's Collections field when creating or editing it."
        />
      )}
    </div>
  );
}
