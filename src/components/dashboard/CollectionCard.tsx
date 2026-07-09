import Link from "next/link";
import { Star } from "lucide-react";

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
    <Link href={`/collections/${collection.id}`} className="group">
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
          <CardTitle className="flex items-center gap-2">
            <span className="truncate">{collection.name}</span>
            {collection.isFavorite && (
              <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
            )}
          </CardTitle>
          <CardDescription>
            {collection.itemCount} {collection.itemCount === 1 ? "item" : "items"}
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
  );
}
