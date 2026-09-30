import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import { Badge } from "@/components/ui/badge";
import { SheetTitle } from "@/components/ui/sheet";
import { pluralTypeName } from "@/lib/type-names";
import type { ItemTypeSummary } from "@/types/items";

interface ItemSheetHeadingProps {
  type: ItemTypeSummary;
  title: string;
  /** Extra badges after the type, e.g. the language in view mode. */
  children?: React.ReactNode;
}

/**
 * The drawer's identity row — type chip, title and type badge — shared by view
 * and edit mode so it doesn't shift when the drawer flips between them.
 */
export function ItemSheetHeading({
  type,
  title,
  children,
}: ItemSheetHeadingProps) {
  return (
    <div className="flex items-start gap-3">
      <ItemTypeIcon type={type} />
      <div className="flex min-w-0 flex-col gap-2">
        <SheetTitle className="text-lg leading-tight">{title}</SheetTitle>
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Shown pluralized to match the sidebar and the listing headings */}
          <Badge variant="secondary">{pluralTypeName(type.name)}</Badge>
          {children}
        </div>
      </div>
    </div>
  );
}
