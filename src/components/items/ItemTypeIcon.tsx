import { File, type LucideIcon } from "lucide-react";

import { typeColorTint } from "@/lib/type-colors";
import { typeIcons } from "@/lib/type-icons";
import type { ItemTypeSummary } from "@/types/items";

// Chip and glyph classes per size: "xs" for the command palette's rows, "sm"
// for cards and rows, "md" for headers
const SIZES = {
  xs: { chip: "size-7", icon: "size-3.5" },
  sm: { chip: "size-9", icon: "size-4" },
  md: { chip: "size-10", icon: "size-5" },
} as const;

interface ItemTypeIconProps {
  type: ItemTypeSummary;
  size?: keyof typeof SIZES;
  /** Replaces the type's own icon, e.g. a file-extension icon in FileRow */
  icon?: LucideIcon;
}

/**
 * The icon chip tinted with an item type's colour, used wherever an item or
 * type is shown: cards, rows, the items page header and the drawer (shared by
 * its view and edit modes so the drawer's identity doesn't shift between them).
 * No client hooks, so it renders on the server too.
 */
export function ItemTypeIcon({ type, size = "md", icon }: ItemTypeIconProps) {
  // Looked up from the table or taken from a prop rather than through a
  // function call: assigning a call's returned component to a local at the top
  // level of a component trips react-hooks/static-components
  const Icon = icon ?? typeIcons[type.icon] ?? File;
  const classes = SIZES[size];

  return (
    <div
      className={`flex ${classes.chip} shrink-0 items-center justify-center rounded-lg`}
      style={{
        backgroundColor: typeColorTint(type.color, 10),
        color: type.color,
      }}
    >
      <Icon className={classes.icon} />
    </div>
  );
}
