// Item type names are singular in the database ("Snippet"); the sidebar, the
// listing headings and the /items/[slug] URLs all use the plural. Every system
// type name pluralizes regularly, so a trailing "s" is the whole rule.
//
// Import-free so client components can use it.

/** "Snippet" → "Snippets" */
export function pluralTypeName(name: string): string {
  return `${name}s`;
}

/** "Snippet" → "snippets", the segment the sidebar links to. */
export function typeSlug(name: string): string {
  return pluralTypeName(name).toLowerCase();
}

/**
 * "snippets" → "snippet", the inverse of `typeSlug`. Lowercased first so the
 * trailing "s" is stripped whatever case the URL used — the name lookup it
 * feeds is case-insensitive, and this has to agree with it.
 */
export function singularFromSlug(slug: string): string {
  const normalized = slug.toLowerCase();
  return normalized.endsWith("s") ? normalized.slice(0, -1) : normalized;
}
