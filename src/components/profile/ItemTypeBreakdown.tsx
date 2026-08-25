import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { typeColorTint } from "@/lib/type-colors";
import { getTypeIcon } from "@/lib/type-icons";
import type { ItemTypeNavItem } from "@/types/items";

interface ItemTypeBreakdownProps {
  itemTypes: ItemTypeNavItem[];
}

/**
 * Per-type item counts. Every system type is listed, zeroes included — the
 * point of the breakdown is to show the shape of what's stored, and hiding the
 * empty rows would make a new account's profile look like the feature is
 * broken rather than like there's nothing in it yet.
 */
export function ItemTypeBreakdown({ itemTypes }: ItemTypeBreakdownProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Items by type</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {itemTypes.map((type) => {
            const Icon = getTypeIcon(type.icon);
            return (
              <div
                key={type.id}
                className="flex items-center gap-3 rounded-lg border p-3"
                style={{ borderColor: typeColorTint(type.color, 25) }}
              >
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-md"
                  style={{ backgroundColor: typeColorTint(type.color, 10) }}
                >
                  <Icon className="size-4" style={{ color: type.color }} />
                </span>
                <div className="min-w-0">
                  <dt className="flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                    {type.name}
                    {type.isPro && (
                      <Badge
                        variant="outline"
                        className="h-4 px-1 text-[10px] uppercase tracking-wide text-muted-foreground"
                      >
                        Pro
                      </Badge>
                    )}
                  </dt>
                  <dd className="text-lg font-semibold">{type.count}</dd>
                </div>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}
