"use client";

import { Copy, Pencil, Pin, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ItemDetail, ItemSummary } from "@/types/items";

interface ItemDrawerActionsProps {
  item: ItemSummary;
  detail: ItemDetail | null;
}

/**
 * The drawer's action bar: Favorite, Pin and Copy on the left, Edit and Delete
 * right-aligned.
 *
 * Only Copy does anything yet — item CRUD is a later phase. The other four are
 * deliberately not `disabled`: dimming them would drop the state colours (a
 * favorited item's yellow star, a pinned item's filled pin) that make the bar
 * readable at a glance, and each already has its own handler, so wiring one up
 * later means replacing a single toast call.
 */
export function ItemDrawerActions({ item, detail }: ItemDrawerActionsProps) {
  // Whatever this item actually holds — text content, a link, or a file URL
  const copyable = detail?.content ?? detail?.url ?? detail?.fileUrl ?? null;

  async function handleCopy() {
    if (!copyable) return;
    try {
      await navigator.clipboard.writeText(copyable);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not copy — your browser blocked clipboard access");
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toast("Favoriting items is coming soon")}
      >
        <Star
          className={cn(
            "size-4",
            item.isFavorite && "fill-yellow-400 text-yellow-400",
          )}
        />
        Favorite
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => toast("Pinning items is coming soon")}
      >
        <Pin className={cn("size-4", item.isPinned && "fill-current")} />
        Pin
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        // Nothing to put on the clipboard until the detail fetch lands
        disabled={!copyable}
      >
        <Copy className="size-4" />
        Copy
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => toast("Editing items is coming soon")}
        >
          <Pencil className="size-4" />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-destructive hover:text-destructive"
          onClick={() => toast("Deleting items is coming soon")}
        >
          <Trash2 className="size-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
}
