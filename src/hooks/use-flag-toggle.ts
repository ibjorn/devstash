"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import type { FlagActionResult } from "@/lib/flag-action";

interface UseFlagToggleOptions {
  /** The saved value, from the server-rendered props. */
  value: boolean;
  save: (next: boolean) => Promise<FlagActionResult>;
  /** Told about every value shown, including a revert after a failure. */
  onChange?: (value: boolean) => void;
  /** Shown when the action fails without saying why. */
  errorMessage: string;
  /** Toasted after a save, keyed by the value saved. Omit for no toast. */
  successMessage?: (value: boolean) => string;
}

/**
 * An optimistic boolean toggle (favorite star, pin): flips at once, puts the
 * old value back with an error toast if the save fails, and refreshes the page
 * data on success so every other indicator, the sidebar and the stats catch up.
 */
export function useFlagToggle({
  value: savedProp,
  save,
  onChange,
  errorMessage,
  successMessage,
}: UseFlagToggleOptions) {
  const router = useRouter();
  const [value, setValue] = useState(savedProp);
  const [saved, setSaved] = useState(savedProp);
  const pending = useRef(false);

  // Follow the prop when fresh server data arrives (a refresh, or the drawer
  // opening another item), without an effect
  if (savedProp !== saved) {
    setSaved(savedProp);
    setValue(savedProp);
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
    const next = !previous;
    show(next);

    let result: FlagActionResult;
    try {
      result = await save(next);
    } catch {
      result = { success: false, error: "Could not reach the server." };
    } finally {
      pending.current = false;
    }

    if (!result.success) {
      show(previous);
      toast.error(result.error ?? errorMessage);
      return;
    }

    if (successMessage) toast.success(successMessage(next));
    router.refresh();
  }

  return { value, toggle };
}
