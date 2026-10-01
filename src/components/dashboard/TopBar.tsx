import { Search } from "lucide-react";

import { NewCollectionDialog } from "@/components/collections/NewCollectionDialog";
import { NewItemDialog } from "@/components/items/NewItemDialog";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import type { CreatableItemType } from "@/types/items";

interface TopBarProps {
  newItemTypes: CreatableItemType[];
}

export function TopBar({ newItemTypes }: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4">
      <SidebarTrigger />
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search items..."
          className="pl-9"
          readOnly
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <NewCollectionDialog />
        <NewItemDialog types={newItemTypes} />
      </div>
    </header>
  );
}
