import { File, Pin, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { typeColorTint } from "@/lib/type-colors";
import { typeIcons } from "@/lib/type-icons";
import type { ItemSummary } from "@/types/items";

interface ItemCardProps {
  item: ItemSummary;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * An item in the /items/[type] grid. The dashboard's ItemRow is the same
 * information laid out horizontally for a single-column list; this is the
 * taller shape a two-column grid wants, sharing its type-colour treatment.
 */
export function ItemCard({ item }: ItemCardProps) {
  const Icon = typeIcons[item.type.icon] ?? File;

  return (
    <div
      className="flex h-full flex-col gap-3 rounded-xl border border-l-4 bg-card p-4 transition-shadow hover:ring-1 hover:ring-foreground/25"
      // subtle border all round, with a solid accent edge in the item type's color
      style={{
        borderColor: typeColorTint(item.type.color, 25),
        borderLeftColor: item.type.color,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          // icon chip tinted with the item type's color
          style={{
            backgroundColor: typeColorTint(item.type.color, 10),
            color: item.type.color,
          }}
        >
          <Icon className="size-4" />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-1">
          {item.isFavorite && (
            <Star className="size-3.5 fill-yellow-400 text-yellow-400" />
          )}
          {item.isPinned && <Pin className="size-3.5 text-muted-foreground" />}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <h3 className="truncate text-sm font-medium">{item.title}</h3>
        {item.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="flex min-w-0 flex-wrap gap-1.5">
          {item.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(item.createdAt)}
        </span>
      </div>
    </div>
  );
}
