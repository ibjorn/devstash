/**
 * Whether a sidebar link should show as current. Prefix matching keeps a
 * section lit on its nested routes; `exact` is for a parent link whose
 * children have links of their own (e.g. /collections vs /collections/[id]).
 */
export function isActivePath(
  pathname: string,
  href: string,
  { exact = false }: { exact?: boolean } = {},
): boolean {
  if (pathname === href) return true;
  return !exact && pathname.startsWith(`${href}/`);
}

/**
 * Active-link styling layered on shadcn's menu button: a primary-coloured bar
 * on the left, since the accent background alone barely shows on the dark
 * sidebar.
 */
export const NAV_ACTIVE_CLASS =
  "relative data-active:before:absolute data-active:before:inset-y-1.5 data-active:before:left-0 data-active:before:w-0.5 data-active:before:rounded-full data-active:before:bg-sidebar-primary";
