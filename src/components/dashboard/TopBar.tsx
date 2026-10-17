import { Sparkles, Star } from "lucide-react";
import Link from "next/link";

import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { SearchPalette } from "@/components/search/SearchPalette";
import { buttonVariants } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import type { CollectionOption } from "@/types/collections";
import type { NewItemTypeOption } from "@/types/items";

interface TopBarProps {
  newItemTypes: NewItemTypeOption[];
  collectionOptions: CollectionOption[];
  /** Free (checkout would go through) — shows the Upgrade link. */
  canUpgrade: boolean;
}

export function TopBar({
  newItemTypes,
  collectionOptions,
  canUpgrade,
}: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 sm:gap-4">
      <SidebarTrigger className="pointer-coarse:size-10" />
      <SearchPalette />
      <div className="ml-auto flex items-center gap-2">
        {canUpgrade && (
          // Deliberately quieter than the create buttons beside it
          <Link
            href="/upgrade"
            aria-label="Upgrade"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground hover:text-foreground",
            )}
          >
            <Sparkles />
            <span className="hidden sm:inline">Upgrade</span>
          </Link>
        )}
        <Link
          href="/favorites"
          aria-label="Favorites"
          title="Favorites"
          className={buttonVariants({ variant: "ghost", size: "icon" })}
        >
          <Star />
        </Link>
        <NewCollectionDialog />
        <NewItemDialog types={newItemTypes} collections={collectionOptions} />
      </div>
    </header>
  );
}
