import { CalendarDays } from "lucide-react";

import { DrawerSection } from "@/components/items/DrawerSection";
import type { ItemDetail } from "@/types/items";

interface ItemDetailsSectionProps {
  detail: ItemDetail;
}

function formatFullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** The drawer's Details section: created and updated dates. */
export function ItemDetailsSection({ detail }: ItemDetailsSectionProps) {
  return (
    <DrawerSection icon={CalendarDays} title="Details">
      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Created</dt>
          <dd>{formatFullDate(detail.createdAt)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-muted-foreground">Updated</dt>
          <dd>{formatFullDate(detail.updatedAt)}</dd>
        </div>
      </dl>
    </DrawerSection>
  );
}
