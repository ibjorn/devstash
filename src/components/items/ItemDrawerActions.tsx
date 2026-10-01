"use client";

import { Copy, Pencil, Pin, Star } from "lucide-react";
import { toast } from "sonner";

import { setItemFavorite } from "@/actions/favorites";
import { setItemPinned } from "@/actions/pins";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { Button } from "@/components/ui/button";
import { useFavoriteToggle } from "@/hooks/use-favorite-toggle";
import { useFlagToggle } from "@/hooks/use-flag-toggle";
import { cn } from "@/lib/utils";
import type { ItemDetail, ItemFlags, ItemSummary } from "@/types/items";

interface ItemDrawerActionsProps {
  item: ItemSummary;
  detail: ItemDetail | null;
  onEdit: () => void;
  onDeleted: () => void;
  /** Keeps the drawer's copy of the item in step with the star and pin. */
  onFlagsChange: (id: string, flags: ItemFlags) => void;
}

/**
 * The drawer's action bar: Favorite, Pin and Copy on the left, Edit and Delete
 * right-aligned.
 *
 * Unlike the star, pinning toasts on success: it moves the item to the top of
 * its listing and into the dashboard's Pinned section, and the toast explains
 * the jump.
 */
export function ItemDrawerActions({
  item,
  detail,
  onEdit,
  onDeleted,
  onFlagsChange,
}: ItemDrawerActionsProps) {
  const { isFavorite, toggle } = useFavoriteToggle({
    isFavorite: item.isFavorite,
    save: (next) => setItemFavorite(item.id, next),
    onChange: (value) => onFlagsChange(item.id, { isFavorite: value }),
  });
  const { value: isPinned, toggle: togglePinned } = useFlagToggle({
    value: item.isPinned,
    save: (next) => setItemPinned(item.id, next),
    onChange: (value) => onFlagsChange(item.id, { isPinned: value }),
    errorMessage: "Could not update this item.",
    successMessage: (pinned) => (pinned ? "Pinned" : "Unpinned"),
  });

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
        onClick={toggle}
        aria-pressed={isFavorite}
      >
        <Star
          className={cn(
            "size-4",
            isFavorite && "fill-yellow-400 text-yellow-400",
          )}
        />
        Favorite
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={togglePinned}
        aria-pressed={isPinned}
      >
        <Pin className={cn("size-4", isPinned && "fill-current")} />
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
