/** "Sep 30" — the compact date the item cards and rows show. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** "October 15, 2026" — for dates a user plans around, like a renewal. */
export function formatLongDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
