import Link from "next/link";
import { Star } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { itemTypes, type Collection } from "@/lib/mock-data";
import { getTypeIcon } from "@/lib/type-icons";

interface CollectionCardProps {
  collection: Collection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  const dominantType = itemTypes.find(
    (type) => type.id === (collection.defaultTypeId ?? collection.itemTypeIds[0])
  );
  const collectionTypes = collection.itemTypeIds.flatMap(
    (id) => itemTypes.find((type) => type.id === id) ?? []
  );

  return (
    <Link href={`/collections/${collection.id}`} className="group">
      <Card
        className="h-full transition-shadow group-hover:ring-foreground/25"
        // background tint comes from the collection's dominant item type color
        style={
          dominantType
            ? { backgroundColor: `${dominantType.color}0d` }
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
          <CardDescription>{collection.itemCount} items</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {collection.description}
          </p>
          <div className="mt-auto flex items-center gap-2">
            {collectionTypes.map((type) => {
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
