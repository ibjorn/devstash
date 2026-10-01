// Import-free so it can be unit tested without the database.

/** How much of an item's content the palette searches and shows. */
export const SEARCH_PREVIEW_LENGTH = 200;

/**
 * A single-line excerpt of an item's content for the command palette:
 * whitespace collapsed, cut by code point (never mid surrogate pair) and
 * marked with an ellipsis when cut. Blank content gives null.
 */
export function toSearchPreview(
  text: string | null,
  length = SEARCH_PREVIEW_LENGTH,
): string | null {
  if (!text) return null;

  // Bounded before collapsing so a 100k-character item isn't fully scanned
  const head = text.slice(0, length * 4);
  const collapsed = head.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;

  const chars = Array.from(collapsed);
  if (chars.length > length)
    return `${chars.slice(0, length).join("").trimEnd()}…`;

  return head.length < text.length ? `${collapsed}…` : collapsed;
}
