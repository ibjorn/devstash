"use client";

import { Folder } from "lucide-react";

import { ItemTypeIcon } from "@/components/items/ItemTypeIcon";
import { CommandItem, CommandShortcut } from "@/components/ui/command";
import { plural } from "@/lib/plural";
import { pluralTypeName } from "@/lib/type-names";
import type { SearchCollection, SearchItem } from "@/types/search";

function itemKeywords(item: SearchItem): string[] {
  return [
    item.title,
    item.description ?? "",
    item.type.name,
    pluralTypeName(item.type.name),
    ...item.tags,
    item.preview ?? "",
  ].filter(Boolean);
}

interface SearchItemResultProps {
  item: SearchItem;
  onSelect: (item: SearchItem) => void;
}

/** An item in the palette: type icon, title, preview line and type name. */
export function SearchItemResult({ item, onSelect }: SearchItemResultProps) {
  return (
    <CommandItem
      value={`item:${item.id}`}
      keywords={itemKeywords(item)}
      onSelect={() => onSelect(item)}
    >
      <ItemTypeIcon type={item.type} size="xs" />
      <div className="flex min-w-0 flex-col">
        <span className="truncate">{item.title}</span>
        {item.preview && (
          <span className="truncate text-xs text-muted-foreground">
            {item.preview}
          </span>
        )}
      </div>
      <CommandShortcut className="tracking-normal">
        {item.type.name}
      </CommandShortcut>
    </CommandItem>
  );
}

interface SearchCollectionResultProps {
  collection: SearchCollection;
  onSelect: (id: string) => void;
}

/** A collection in the palette: folder, name and item count. */
export function SearchCollectionResult({
  collection,
  onSelect,
}: SearchCollectionResultProps) {
  return (
    <CommandItem
      value={`collection:${collection.id}`}
      keywords={[collection.name, collection.description ?? ""].filter(
        Boolean,
      )}
      onSelect={() => onSelect(collection.id)}
    >
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Folder className="size-3.5" />
      </div>
      <span className="truncate">{collection.name}</span>
      <CommandShortcut className="tracking-normal">
        {plural(collection.itemCount, "item")}
      </CommandShortcut>
    </CommandItem>
  );
}
