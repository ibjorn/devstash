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
import type {
  ItemDetail,
  ItemDetailResponse,
  ItemSummary,
} from "@/types/items";

interface ItemDrawerContextValue {
  openItem: (item: ItemSummary) => void;
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
 * Holds the drawer's state for a page. The listing pages are server
 * components, so they can't own this or hand a click handler to a card — the
 * cards reach it through context instead.
 */
export function ItemDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [item, setItem] = useState<ItemSummary | null>(null);
  const [detail, setDetail] = useState<ItemDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  // Identifies the newest open, so a slow fetch for an item the user has
  // already navigated past can't overwrite the one they're looking at
  const latestRequest = useRef(0);

  const openItem = useCallback((next: ItemSummary) => {
    setItem(next);
    // Opening is the one moment edit mode has to be cleared. Doing it on close
    // instead would flip the drawer back to view mode mid-slide-out.
    setEditing(false);
    setDetail(null);
    setError(null);
    setOpen(true);

    const request = ++latestRequest.current;
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
        editing={editing}
        onEditingChange={setEditing}
      />
    </ItemDrawerContext.Provider>
  );
}
