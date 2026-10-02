import Link from "next/link";
import { Star } from "lucide-react";

import { CollectionCardMenu } from "@/components/collections/CollectionCardMenu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { typeColorTint } from "@/lib/type-colors";
import { getTypeIcon } from "@/lib/type-icons";
import type { CollectionSummary } from "@/types/collections";

interface CollectionCardProps {
  collection: CollectionSummary;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const dominantType = collection.types[0];

  return (
    // The menu sits beside the link, not in it: a button inside an <a> is
    // invalid HTML, and its clicks would navigate
    // group on the wrapper, so hovering the menu still highlights the card
    <div className="group relative">
      <Link href={`/collections/${collection.id}`} className="block h-full">
        <Card
          className="h-full transition-shadow group-hover:ring-foreground/25"
          // tint and border come from the collection's most-used item type color
          style={
            dominantType
              ? {
                  backgroundColor: typeColorTint(dominantType.color, 5),
                  borderColor: typeColorTint(dominantType.color, 25),
                }
              : undefined
          }
        >
          <CardHeader>
            {/* min-w-0 lets the title shrink inside CardHeader's grid so it
              truncates; the padding keeps it and its star clear of the menu */}
            <CardTitle className="flex min-w-0 items-center gap-2 pr-10 pointer-coarse:pr-12">
              <span className="truncate">{collection.name}</span>
              {collection.isFavorite && (
                <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
              )}
            </CardTitle>
            <CardDescription>
              {collection.itemCount}{" "}
              {collection.itemCount === 1 ? "item" : "items"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col gap-4">
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {collection.description}
            </p>
            <div className="mt-auto flex items-center gap-2">
              {collection.types.map((type) => {
                const Icon = getTypeIcon(type.icon);
                return (
                  <Icon
                    key={type.id}
                    className="size-4"
                    style={{ color: type.color }}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      </Link>
      <CollectionCardMenu
        collection={collection}
        className="absolute top-3 right-3"
      />
    </div>
  );
}
