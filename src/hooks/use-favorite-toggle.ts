"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import type { FavoriteActionResult } from "@/actions/favorites";

interface UseFavoriteToggleOptions {
  /** The saved value, from the server-rendered props. */
  isFavorite: boolean;
  save: (next: boolean) => Promise<FavoriteActionResult>;
  /** Told about every value shown, including a revert after a failure. */
  onChange?: (value: boolean) => void;
}

/**
 * An optimistic favorite star: flips at once, puts the old value back with an
 * error toast if the save fails, and refreshes the page data on success so
 * every other star, the sidebar and the stats catch up. No success toast — the
 * star is the feedback.
 */
export function useFavoriteToggle({
  isFavorite,
  save,
  onChange,
}: UseFavoriteToggleOptions) {
  const router = useRouter();
  const [value, setValue] = useState(isFavorite);
  const [saved, setSaved] = useState(isFavorite);
  const pending = useRef(false);

  // Follow the prop when fresh server data arrives (a refresh, or the drawer
  // opening another item), without an effect
  if (isFavorite !== saved) {
    setSaved(isFavorite);
    setValue(isFavorite);
  }

  function show(next: boolean) {
    setValue(next);
    onChange?.(next);
  }

  async function toggle() {
    // One request at a time, so a fast double click can't race itself
    if (pending.current) return;
    pending.current = true;

    const previous = value;
    show(!previous);

    let result: FavoriteActionResult;
    try {
      result = await save(!previous);
    } catch {
      result = { success: false, error: "Could not reach the server." };
    } finally {
      pending.current = false;
    }

    if (!result.success) {
      show(previous);
      toast.error(result.error ?? "Could not update favorites.");
      return;
    }

    router.refresh();
  }

  return { isFavorite: value, toggle };
}
