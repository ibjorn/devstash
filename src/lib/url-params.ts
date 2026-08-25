/**
 * Drops a search param from the address bar so a refresh can't replay a
 * one-shot hand-off (a stale ?error= or a spent ?reset=).
 *
 * String, not a URL object — that's the form Next's patched replaceState
 * documents for search-param updates that skip a refetch.
 *
 * Browser-only: call it from an effect, never during render.
 */
export function stripSearchParam(name: string) {
  const url = new URL(window.location.href);
  url.searchParams.delete(name);
  window.history.replaceState(null, "", `${url.pathname}${url.search}`);
}
