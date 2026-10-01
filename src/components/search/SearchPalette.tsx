"use client";

import { Folder, Loader2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { scoreSearchMatch } from "@/lib/search-score";
import { pluralTypeName } from "@/lib/type-names";
import type {
  SearchData,
  SearchDataResponse,
  SearchItem,
} from "@/types/search";

// Any open Radix dialog, sheet or alert dialog other than the palette itself
const OPEN_DIALOG =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';

// Dates don't survive JSON; the API sends createdAt as an ISO string
function toSearchData(body: SearchDataResponse): SearchData {
  return {
    items: body.items.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
    })),
    collections: body.collections,
  };
}

function itemKeywords(item: SearchItem): string[] {
  return [
    item.title,
    item.description ?? "",
    item.type.name,
    pluralTypeName(item.type.name),
    ...item.tags,
    item.preview ?? "",
  ].filter(Boolean);
}

/**
 * The top bar's search box and the Ctrl K / ⌘K command palette it opens.
 *
 * The index is fetched when the palette opens, not with the page, so it never
 * rides along in every page render. Later opens show the cached copy straight
 * away and refetch behind it, so items created since still turn up.
 */
export function SearchPalette() {
  const router = useRouter();
  const { openItem } = useItemDrawer();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [data, setData] = useState<SearchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);
  // Set when an item is chosen, so the palette doesn't hand focus back to the
  // search box while the drawer is taking it
  const openingItem = useRef(false);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    setError(null);

    try {
      const response = await fetch("/api/search");
      const body = await response.json();
      if (request !== latestRequest.current) return;

      if (!response.ok || !body?.success) {
        setError(body?.error ?? "Could not load search.");
        return;
      }

      setData(toSearchData(body.data as SearchDataResponse));
    } catch {
      if (request === latestRequest.current) {
        setError("Could not load search.");
      }
    }
  }, []);

  const openPalette = useCallback(() => {
    setSearch("");
    setOpen(true);
    void load();
  }, [load]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (!(event.metaKey || event.ctrlKey) || event.repeat) return;
      // Chrome would otherwise move focus to the address bar
      event.preventDefault();

      if (open) {
        setOpen(false);
      } else if (!document.querySelector(OPEN_DIALOG)) {
        openPalette();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, openPalette]);

  function selectItem(item: SearchItem) {
    // A SearchItem is an ItemSummary; the drawer fetches the rest itself
    openingItem.current = true;
    setOpen(false);
    openItem(item);
  }

  function selectCollection(id: string) {
    setOpen(false);
    router.push(`/collections/${id}`);
  }

  const query = search.trim();

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        className="flex h-8 w-full max-w-md items-center gap-2 rounded-lg border border-input bg-transparent px-2.5 text-sm text-muted-foreground transition-colors outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
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

      <Dialog
        open={open}
        onOpenChange={(next) => (next ? openPalette() : setOpen(false))}
      >
        <DialogContent
          className="top-1/4 translate-y-0 overflow-hidden rounded-xl! p-0"
          showCloseButton={false}
          onCloseAutoFocus={(event) => {
            if (!openingItem.current) return;
            openingItem.current = false;
            event.preventDefault();
          }}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Search your items and collections
            </DialogDescription>
          </DialogHeader>
          <Command filter={scoreSearchMatch}>
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search items and collections…"
            />
            <CommandList className="max-h-96">
              {!query ? (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                  Type to search your items and collections.
                </p>
              ) : !data ? (
                <p
                  className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"
                  role="status"
                >
                  {error ?? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Loading…
                    </>
                  )}
                </p>
              ) : (
                <>
                  <CommandEmpty>No results for “{query}”.</CommandEmpty>
                  <CommandGroup heading="Items">
                    {data.items.map((item) => (
                      <CommandItem
                        key={item.id}
                        value={`item:${item.id}`}
                        keywords={itemKeywords(item)}
                        onSelect={() => selectItem(item)}
                      >
                        <ItemTypeIcon type={item.type} size="xs" />
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate">{item.title}</span>
                          {item.preview && (
                            <span className="truncate text-xs text-muted-foreground">
                              {item.preview}
                            </span>
                          )}
                        </div>
                        <CommandShortcut className="tracking-normal">
                          {item.type.name}
                        </CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Collections">
                    {data.collections.map((collection) => (
                      <CommandItem
                        key={collection.id}
                        value={`collection:${collection.id}`}
                        keywords={[
                          collection.name,
                          collection.description ?? "",
                        ].filter(Boolean)}
                        onSelect={() => selectCollection(collection.id)}
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <Folder className="size-3.5" />
                        </div>
                        <span className="truncate">{collection.name}</span>
                        <CommandShortcut className="tracking-normal">
                          {collection.itemCount}{" "}
                          {collection.itemCount === 1 ? "item" : "items"}
                        </CommandShortcut>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
