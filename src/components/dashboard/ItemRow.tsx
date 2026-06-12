import { File, Pin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { itemTypes, type Item } from "@/lib/mock-data";
import { typeIcons } from "@/lib/type-icons";

interface ItemRowProps {
  item: Item;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function ItemRow({ item }: ItemRowProps) {
  const type = itemTypes.find((t) => t.id === item.itemTypeId);
  const Icon = typeIcons[type?.icon ?? ""] ?? File;

  return (
    <div className="flex items-start gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-shadow hover:ring-foreground/25">
      <div
        className="flex size-9 shrink-0 items-center justify-center rounded-lg"
        // icon chip tinted with the item type's color
        style={
          type
            ? { backgroundColor: `${type.color}1a`, color: type.color }
            : undefined
        }
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{item.title}</span>
          {item.isFavorite && (
            <Star className="size-3.5 shrink-0 fill-yellow-400 text-yellow-400" />
          )}
          {item.isPinned && (
            <Pin className="size-3.5 shrink-0 text-muted-foreground" />
          )}
        </div>
        {item.description && (
          <p className="truncate text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {formatDate(item.createdAt)}
      </span>
    </div>
  );
}
