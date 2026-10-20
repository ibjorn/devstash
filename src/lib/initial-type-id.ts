/**
 * The type a fresh New Item form starts on: on /items/[slug], that page's
 * type; anywhere else — or for a slug that matches none — the first one.
 */
export function initialTypeId(
  types: { id: string; slug: string }[],
  pathname: string,
): string | undefined {
  const match = /^\/items\/([^/]+)/.exec(pathname);
  if (match) {
    const slug = decodeURIComponent(match[1]).toLowerCase();
    const fromPage = types.find((type) => type.slug === slug);
    if (fromPage) return fromPage.id;
  }
  return types[0]?.id;
}
