export const ITEMS_PER_PAGE = 21;
export const COLLECTIONS_PER_PAGE = 21;
export const DASHBOARD_COLLECTIONS_LIMIT = 6;
export const DASHBOARD_RECENT_ITEMS_LIMIT = 10;

/** A page's slice of a listing plus the size of the whole listing. */
export interface Page<T> {
  rows: T[];
  total: number;
}

/**
 * Reads `?page=` as a 1-based page number. Anything that isn't a plain
 * positive integer — missing, repeated, "0", "-2", "1.5", "2abc" — is page 1.
 */
export function parsePageParam(raw: string | string[] | undefined): number {
  if (typeof raw !== "string" || !/^\d+$/.test(raw)) return 1;
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

/** Number of pages a listing needs; an empty listing still has page 1. */
export function pageCount(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}

/** The `skip`/`take` pair for a 1-based page. */
export function pageRange(page: number, perPage: number) {
  return { skip: (page - 1) * perPage, take: perPage };
}

/** Page 1 is the bare path, so it shares a URL with the unpaginated link. */
export function pageHref(basePath: string, page: number): string {
  return page <= 1 ? basePath : `${basePath}?page=${page}`;
}

export type PageLink = number | "ellipsis";

/**
 * The page numbers to show in the controls: always the first and last page
 * and `siblings` either side of the current one, with an ellipsis standing in
 * for each gap. A gap of exactly one page shows that page instead, since an
 * ellipsis would take the same room and hide it.
 */
export function pageLinks(
  current: number,
  total: number,
  siblings = 1,
): PageLink[] {
  const start = Math.max(2, current - siblings);
  const end = Math.min(total - 1, current + siblings);
  const links: PageLink[] = [1];

  if (start === 3) links.push(2);
  else if (start > 3) links.push("ellipsis");

  for (let page = start; page <= end; page++) links.push(page);

  if (end === total - 2) links.push(total - 1);
  else if (end < total - 2) links.push("ellipsis");

  if (total > 1) links.push(total);
  return links;
}
