"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import type { ItemSummary } from "@/types/items";

interface CopyItemButtonProps {
  item: ItemSummary;
  className?: string;
}

class NothingToCopyError extends Error {}

// File and Image items hold a private object key, not something to paste
export function isCopyable(item: ItemSummary): boolean {
  return item.fileName === null;
}

// Cards hold only the summary, so the content is fetched on click rather than
// shipping every item's content (up to 100k characters each) with every list.
async function fetchCopyText(id: string): Promise<string> {
  const response = await fetch(`/api/items/${encodeURIComponent(id)}`);
  const body = await response.json();
  if (!response.ok || !body?.success) {
    throw new Error(body?.error ?? "Could not load this item.");
  }
  const text: string | null = body.data.content ?? body.data.url;
  if (!text) throw new NothingToCopyError();
  return text;
}

// Safari only allows a clipboard write that starts inside the click, not after
// an await, so where ClipboardItem exists it is handed the pending text instead
async function writeToClipboard(text: Promise<string>) {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard.write) {
    const blob = text.then(
      (value) => new Blob([value], { type: "text/plain" }),
    );
    await navigator.clipboard.write([
      new ClipboardItem({ "text/plain": blob }),
    ]);
  } else {
    await navigator.clipboard.writeText(await text);
  }
}

/**
 * A quick copy for an item card. It sits beside the card's button rather than
 * inside it — a button nested in a <button> is invalid HTML — so a copy click
 * never opens the drawer. Renders nothing for items that aren't copyable.
 */
export function CopyItemButton({ item, className }: CopyItemButtonProps) {
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  if (!isCopyable(item)) return null;

  async function handleCopy() {
    setPending(true);
    const text = fetchCopyText(item.id);
    try {
      await writeToClipboard(text);
    } catch {
      // A failed fetch surfaces as a generic clipboard error; recover the reason
      const reason = await text.then(
        () => null,
        (error: unknown) => error,
      );
      if (reason instanceof NothingToCopyError) {
        toast("Nothing to copy — this item is empty");
      } else if (reason) {
        toast.error("Could not copy — the item failed to load");
      } else {
        toast.error("Could not copy — your browser blocked clipboard access");
      }
      return;
    } finally {
      setPending(false);
    }
    toast.success("Copied to clipboard");
    setCopied(true);
    // Restart rather than stack, or an earlier click's timer cuts this one short
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  const Icon = pending ? Loader2 : copied ? Check : Copy;

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={pending}
      aria-label={`Copy ${item.title}`}
      title="Copy"
      className={cn(
        "flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default",
        className,
      )}
    >
      <Icon className={cn("size-4", pending && "animate-spin")} />
    </button>
  );
}
