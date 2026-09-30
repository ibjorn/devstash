import type { Metadata } from "next";
import { File, Layers } from "lucide-react";

import { EmptyState } from "@/components/dashboard/EmptyState";
import { FileRow } from "@/components/items/FileRow";
import { ImageCard } from "@/components/items/ImageCard";
import { ItemCard } from "@/components/items/ItemCard";
import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import { getItemsByTypeSlug } from "@/lib/db/items";
import { requireUserId } from "@/lib/db/session-user";
import { pluralTypeName } from "@/lib/type-names";
import { typeIcons } from "@/lib/type-icons";
import { uploadKindFor } from "@/lib/uploads";

interface ItemsPageProps {
  params: Promise<{ type: string }>;
}

// Render per request — items come from the database
export const dynamic = "force-dynamic";

// Fallback heading for a slug that matches no type; the real name comes from
// the database when there is one.
function titleFromSlug(slug: string): string {
  const decoded = decodeURIComponent(slug);
  return decoded.charAt(0).toUpperCase() + decoded.slice(1);
}

export async function generateMetadata({
  params,
}: ItemsPageProps): Promise<Metadata> {
  const { type } = await params;
  return { title: `${titleFromSlug(type)} · DevStash` };
}

export default async function ItemsPage({ params }: ItemsPageProps) {
  const { type: slug } = await params;
  const userId = await requireUserId();
  const { type, items } = await getItemsByTypeSlug(userId, slug);

  // Singular in the database; the sidebar and this heading both pluralize
  const heading = type ? pluralTypeName(type.name) : titleFromSlug(slug);
  const Icon = type ? (typeIcons[type.icon] ?? File) : Layers;
  // Images get a thumbnail gallery, Files a Drive-style list; every other
  // type keeps the regular card
  const uploadKind = type ? uploadKindFor(type.name) : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex items-center gap-3">
        {type && <ItemTypeIcon type={type} />}
        <div>
          <h1 className="text-2xl font-semibold">{heading}</h1>
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
      </div>

      {items.length > 0 && uploadKind === "file" ? (
        <ul className="divide-y overflow-hidden rounded-xl border bg-card">
          {items.map((item) => (
            <FileRow key={item.id} item={item} />
          ))}
        </ul>
      ) : items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) =>
            uploadKind === "image" ? (
              <ImageCard key={item.id} item={item} />
            ) : (
              <ItemCard key={item.id} item={item} />
            ),
          )}
        </div>
      ) : (
        <EmptyState
          icon={Icon}
          title={type ? `No ${heading.toLowerCase()} yet` : "Nothing here"}
          description={
            type
              ? `Items you save as ${heading.toLowerCase()} will show up here.`
              : `There is no "${titleFromSlug(slug)}" type in your stash — check the address, or pick a type from the sidebar.`
          }
        />
      )}
    </div>
  );
}
