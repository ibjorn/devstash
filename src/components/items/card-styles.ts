import { typeColorTint } from "@/lib/type-colors";

/**
 * The small square icon buttons that sit on cards and rows — favorite, copy,
 * download, the collection ⋯ menu. Bigger on touch screens.
 */
export const CARD_ICON_BUTTON =
  "flex size-8 shrink-0 cursor-pointer pointer-coarse:size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * A subtle border in the item type's colour; `accent` adds the solid left edge
 * the text-item cards use. Data-driven, so it has to be an inline style.
 */
export function itemBorderStyle(
  type: { color: string },
  { accent = false }: { accent?: boolean } = {},
): React.CSSProperties {
  return {
    borderColor: typeColorTint(type.color, 25),
    ...(accent && { borderLeftColor: type.color }),
  };
}
