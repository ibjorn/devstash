import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Folder } from "lucide-react";

import { CollectionCard } from "@/components/dashboard/CollectionCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PaginationControls } from "@/components/pagination/PaginationControls";
import { getCollectionsPage } from "@/lib/db/collections";
import { requireUserId } from "@/lib/db/session-user";
import {
  COLLECTIONS_PER_PAGE,
  pageCount,
  pageHref,
  parsePageParam,
} from "@/lib/pagination";

// Render per request — collections come from the database
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Collections · DevStash" };

interface CollectionsPageProps {
  searchParams: Promise<{ page?: string | string[] }>;
}

export default async function CollectionsPage({
  searchParams,
}: CollectionsPageProps) {
  const page = parsePageParam((await searchParams).page);
  const userId = await requireUserId();
  const { rows: collections, total } = await getCollectionsPage(userId, page);

  // Past the end — a stale link after deleting collections — goes to the last page
  const totalPages = pageCount(total, COLLECTIONS_PER_PAGE);
  if (page > totalPages) redirect(pageHref("/collections", totalPages));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Collections</h1>
        <p className="text-sm text-muted-foreground">
          {total} {total === 1 ? "collection" : "collections"}
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

      <PaginationControls
        basePath="/collections"
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
