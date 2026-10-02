import { Star } from "lucide-react";
import Link from "next/link";

import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { SearchPalette } from "@/components/search/SearchPalette";
import { buttonVariants } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { CollectionOption } from "@/types/collections";
import type { CreatableItemType } from "@/types/items";

interface TopBarProps {
  newItemTypes: CreatableItemType[];
  collectionOptions: CollectionOption[];
}

export function TopBar({ newItemTypes, collectionOptions }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 sm:gap-4">
      <SidebarTrigger className="pointer-coarse:size-10" />
      <SearchPalette />
      <div className="ml-auto flex items-center gap-2">
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
