import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { FolderOpen, Star } from "lucide-react";

import { CollectionActions } from "@/components/collections/CollectionActions";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { FileRow } from "@/components/items/FileRow";
import { ImageCard } from "@/components/items/ImageCard";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import { PaginationControls } from "@/components/pagination/PaginationControls";
import { groupCollectionItems } from "@/lib/collection-items";
import { getCollectionHeader } from "@/lib/db/collections";
import { getItemsInCollection } from "@/lib/db/items";
import { requireUserId } from "@/lib/db/session-user";
import {
  ITEMS_PER_PAGE,
  pageCount,
  pageHref,
  parsePageParam,
} from "@/lib/pagination";
import { pluralTypeName } from "@/lib/type-names";
import type { ItemSummary } from "@/types/items";

interface CollectionPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string | string[] }>;
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

export default async function CollectionPage({
  params,
  searchParams,
}: CollectionPageProps) {
  const { id } = await params;
  const page = parsePageParam((await searchParams).page);
  const userId = await requireUserId();
  // Both queries are scoped to the user, so running them together can't leak
  // items from a collection that turns out not to be theirs
  const [collection, { rows: items, total }] = await Promise.all([
    loadCollectionHeader(userId, id),
    getItemsInCollection(userId, id, page),
  ]);

  // Another user's collection and a nonexistent one look the same
  if (!collection) notFound();

  // Past the end — a stale link after deleting items — goes to the last page
  const basePath = `/collections/${collection.id}`;
  const totalPages = pageCount(total, ITEMS_PER_PAGE);
  if (page > totalPages) redirect(pageHref(basePath, totalPages));

  // Grouped within the page: each page shows its own Images and Files sections
  const { cards, images, files } = groupCollectionItems(items);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
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
            {total} {total === 1 ? "item" : "items"}
          </p>
        </div>
        <CollectionActions collection={collection} />
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

      <PaginationControls
        basePath={basePath}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
