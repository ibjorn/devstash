import { Search } from "lucide-react";

/** The top bar's search box: a button that opens the palette. */
export function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-full max-w-md pointer-coarse:h-10 min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm text-muted-foreground transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
    >
      <Search className="size-4 shrink-0" />
      <span className="truncate">Search items and collections…</span>
      <span className="ml-auto hidden shrink-0 items-center gap-1 text-xs sm:flex">
        <kbd className="rounded border border-border bg-muted px-1.5 font-sans">
          Ctrl K
        </kbd>
        <span aria-hidden>/</span>
        <kbd className="rounded border border-border bg-muted px-1.5 font-sans">
          ⌘K
        </kbd>
      </span>
    </button>
  );
}
