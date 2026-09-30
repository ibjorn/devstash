"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const COPIED_MS = 2000;

/**
 * Copy feedback shared by every copy button: a success toast and a `copied`
 * flag that drives a 2s check mark.
 *
 * `copy(text)` covers the plain case. A caller with its own clipboard write —
 * CopyItemButton hands Safari a pending ClipboardItem — does the write itself
 * and calls `markCopied()` on success.
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const markCopied = useCallback(() => {
    toast.success("Copied to clipboard");
    setCopied(true);
    // Restart rather than stack, or an earlier click's timer cuts this one short
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }, []);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        toast.error("Could not copy — your browser blocked clipboard access");
        return;
      }
      markCopied();
    },
    [markCopied],
  );

  return { copied, copy, markCopied };
}
