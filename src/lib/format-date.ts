/** "Sep 30" — the compact date the item cards and rows show. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
