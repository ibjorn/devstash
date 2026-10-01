"use client";

import type { FavoriteActionResult } from "@/actions/favorites";
import { useFlagToggle } from "@/hooks/use-flag-toggle";

interface UseFavoriteToggleOptions {
  /** The saved value, from the server-rendered props. */
  isFavorite: boolean;
  save: (next: boolean) => Promise<FavoriteActionResult>;
  /** Told about every value shown, including a revert after a failure. */
  onChange?: (value: boolean) => void;
}

/**
 * An optimistic favorite star. No success toast — the star is the feedback.
 */
export function useFavoriteToggle({
  isFavorite,
  save,
  onChange,
}: UseFavoriteToggleOptions) {
  const { value, toggle } = useFlagToggle({
    value: isFavorite,
    save,
    onChange,
    errorMessage: "Could not update favorites.",
  });

  return { isFavorite: value, toggle };
}
