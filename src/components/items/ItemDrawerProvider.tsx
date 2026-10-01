"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { ItemDrawer } from "@/components/items/ItemDrawer";
import type { CollectionOption } from "@/types/collections";
import type {
  ItemDetail,
  ItemDetailResponse,
  ItemFlags,
  ItemSummary,
} from "@/types/items";

interface ItemDrawerContextValue {
  /**
   * Open the drawer on an item. Pass `detail` when it's already in hand — a
   * just-created item — to skip the fetch.
   */
  openItem: (item: ItemSummary, detail?: ItemDetail) => void;
}

const ItemDrawerContext = createContext<ItemDrawerContextValue | null>(null);

/**
 * Opens the item drawer. Throws outside a provider rather than no-oping — a
 * card whose click does nothing is a bug that would otherwise ship quietly.
 */
export function useItemDrawer(): ItemDrawerContextValue {
  const context = useContext(ItemDrawerContext);
  if (!context) {
    throw new Error("useItemDrawer must be used inside an ItemDrawerProvider");
  }

  return context;
}

// Dates don't survive JSON; the API sends them as ISO strings
function toItemDetail(data: ItemDetailResponse): ItemDetail {
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

/**
 * Holds the drawer's state for the signed-in shell. The listing pages are
 * server components, so they can't own this or hand a click handler to a card
 * — the cards reach it through context instead. It sits in AppShell rather than
 * each page so the top bar's New Item dialog can open what it creates.
 */
export function ItemDrawerProvider({
  children,
  collectionOptions,
}: {
  children: React.ReactNode;
  /** Every collection the user owns, for edit mode's collections picker. */
  collectionOptions: CollectionOption[];
}) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<ItemSummary | null>(null);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  // Identifies the newest open, so a slow fetch for an item the user has
  // already navigated past can't overwrite the one they're looking at
  const latestRequest = useRef(0);

  const openItem = useCallback((next: ItemSummary, preloaded?: ItemDetail) => {
    setItem(next);
    // Opening is the one moment edit mode has to be cleared. Doing it on close
    // instead would flip the drawer back to view mode mid-slide-out.
    setEditing(false);
    setDetail(preloaded ?? null);
    setError(null);
    setOpen(true);

    // Bumped either way, so a fetch still in flight for an earlier open can't
    // land on top of a preloaded item
    const request = ++latestRequest.current;
    if (preloaded) return;

    void (async () => {
      try {
        const response = await fetch(`/api/items/${next.id}`);
        const body = await response.json();
        if (request !== latestRequest.current) return;

        if (!response.ok || !body?.success) {
          setError(body?.error ?? "Could not load this item.");
          return;
        }

        setDetail(toItemDetail(body.data as ItemDetailResponse));
      } catch {
        if (request === latestRequest.current) {
          setError("Could not load this item.");
        }
      }
    })();
  }, []);

  // A save returns the item in full, so the drawer repaints from that rather
  // than refetching. The summary is refreshed too — the header, description and
  // tags render from it, and it would otherwise still show the old values.
  const applyUpdate = useCallback((updated: ItemDetail) => {
    setDetail(updated);
    setItem((current) => (current?.id === updated.id ? updated : current));
  }, []);

  // The star and pin are optimistic; mirroring them here keeps a remounted
  // action bar (after leaving edit mode) from showing the stale value. Matched
  // by id, so a revert landing after the user has opened another item is a no-op.
  const applyFlags = useCallback((id: string, flags: ItemFlags) => {
    setItem((current) =>
      current?.id === id ? { ...current, ...flags } : current,
    );
    setDetail((current) =>
      current?.id === id ? { ...current, ...flags } : current,
    );
  }, []);

  const value = useMemo(() => ({ openItem }), [openItem]);

  return (
    <ItemDrawerContext.Provider value={value}>
      {children}
      {/* `item` is deliberately kept on close so the sheet has something to
          render while it animates out */}
      <ItemDrawer
        open={open}
        onOpenChange={setOpen}
        item={item}
        detail={detail}
        error={error}
        onUpdated={applyUpdate}
        onDeleted={() => setOpen(false)}
        onFlagsChange={applyFlags}
        editing={editing}
        onEditingChange={setEditing}
        collectionOptions={collectionOptions}
      />
    </ItemDrawerContext.Provider>
  );
}
