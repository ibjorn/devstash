import { defaultFilter } from "cmdk";

// A match only in the description, tags, type or content preview counts for
// less than a strong one in the title, so "docker" ranks the "Docker cleanup"
// command above a note that merely mentions Docker.
const SECONDARY_WEIGHT = 0.5;

/**
 * Whether every word of the query appears somewhere in the text, as a plain
 * case-insensitive substring. Deliberately not fuzzy: a fuzzy scorer matches
 * any text containing the query's letters in order, and a 200-character content
 * preview contains t…e…s…t almost every time, so "test" matched most items.
 */
function containsEveryWord(text: string, query: string): boolean {
  const haystack = text.toLocaleLowerCase();
  return query
    .toLocaleLowerCase()
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

/**
 * cmdk filter for the command palette. Rows are keyed by id — titles and
 * collection names aren't unique — so the id must never be scored, or a search
 * could fuzzy-match the random characters of a cuid. The text to search rides
 * in `keywords` instead: the title (or name) first, then everything else.
 *
 * The title is matched fuzzily, so "dckr" still finds "Docker cleanup"; that's
 * safe on a short string. The rest only matches when it contains every word.
 */
export function scoreSearchMatch(
  _value: string,
  search: string,
  keywords?: string[],
): number {
  const query = search.trim();
  if (!query || !keywords?.length) return 0;

  const [primary] = keywords;
  const primaryScore = defaultFilter(primary, query);
  const secondaryScore = containsEveryWord(keywords.join(" "), query)
    ? SECONDARY_WEIGHT
    : 0;

  return Math.max(primaryScore, secondaryScore);
}
