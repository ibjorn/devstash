"use client";

import { Copy, Pencil, Pin, Star } from "lucide-react";
import { toast } from "sonner";

import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ItemDetail, ItemSummary } from "@/types/items";

interface ItemDrawerActionsProps {
  item: ItemSummary;
  detail: ItemDetail | null;
  onEdit: () => void;
  onDeleted: () => void;
}

/**
 * The drawer's action bar: Favorite, Pin and Copy on the left, Edit and Delete
 * right-aligned.
 *
 * Copy, Edit and Delete are live; Favorite and Pin are still later phases. The
 * two that aren't wired are deliberately not `disabled`: dimming them would
 * drop the state colours (a favorited item's yellow star, a pinned item's
 * filled pin) that make the bar readable at a glance, and each already has its
 * own handler, so wiring one up later means replacing a single toast call.
 */
export function ItemDrawerActions({
  item,
  detail,
  onEdit,
  onDeleted,
}: ItemDrawerActionsProps) {
  // Text content or a link. A file's fileUrl is a private object key, not
  // something worth putting on a clipboard — files have a Download button.
  const copyable = detail?.content ?? detail?.url ?? null;

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
          onClick={onEdit}
          // Content, url and language live only on the detail fetch, so there
          // is nothing to open a form over until it lands
          disabled={!detail}
        >
          <Pencil className="size-4" />
          Edit
        </Button>
        <DeleteItemDialog item={item} onDeleted={onDeleted} />
      </div>
    </div>
  );
}
