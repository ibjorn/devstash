"use client";

import { useEffect } from "react";

// Any open Radix dialog, sheet or alert dialog other than the palette itself
const OPEN_DIALOG =
  '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]';

/**
 * Ctrl K / ⌘K toggles the command palette. It won't open the palette over
 * another dialog, which would stack focus traps.
 */
export function usePaletteHotkey(
  open: boolean,
  onOpen: () => void,
  onClose: () => void,
) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "k") return;
      if (!(event.metaKey || event.ctrlKey) || event.repeat) return;
      // Chrome would otherwise move focus to the address bar
      event.preventDefault();

      if (open) {
        onClose();
      } else if (!document.querySelector(OPEN_DIALOG)) {
        onOpen();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpen, onClose]);
}
