"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import { useItemDrawer } from "@/components/items/ItemDrawerProvider";
import {
  SearchCollectionResult,
  SearchItemResult,
} from "@/components/search/SearchResults";
import { SearchTrigger } from "@/components/search/SearchTrigger";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePaletteHotkey } from "@/hooks/use-palette-hotkey";
import { useSearchIndex } from "@/hooks/use-search-index";
import { scoreSearchMatch } from "@/lib/search-score";
import type { SearchItem } from "@/types/search";

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
  const { data, error, load } = useSearchIndex();
  // Set when an item is chosen, so the palette doesn't hand focus back to the
  // search box while the drawer is taking it
  const openingItem = useRef(false);

  const openPalette = useCallback(() => {
    setSearch("");
    setOpen(true);
    void load();
  }, [load]);
  const closePalette = useCallback(() => setOpen(false), []);

  usePaletteHotkey(open, openPalette, closePalette);

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
      <SearchTrigger onClick={openPalette} />

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
                      <SearchItemResult
                        key={item.id}
                        item={item}
                        onSelect={selectItem}
                      />
                    ))}
                  </CommandGroup>
                  <CommandGroup heading="Collections">
                    {data.collections.map((collection) => (
                      <SearchCollectionResult
                        key={collection.id}
                        collection={collection}
                        onSelect={selectCollection}
                      />
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
