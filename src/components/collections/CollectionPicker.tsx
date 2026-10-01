"use client";

import { ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { CollectionOption } from "@/types/collections";

interface CollectionPickerProps {
  id: string;
  options: CollectionOption[];
  value: string[];
  onChange: (value: string[]) => void;
  invalid?: boolean;
  describedBy?: string;
}

// Items are keyed by id, since two collections may share a name, so the
// search has to match the name carried in `keywords` rather than the value
function matchName(_value: string, search: string, keywords?: string[]) {
  const name = keywords?.[0]?.toLocaleLowerCase() ?? "";
  return name.includes(search.trim().toLocaleLowerCase()) ? 1 : 0;
}

/**
 * Multi-select for the collections an item belongs to: a searchable list in a
 * popover, with the selection shown as removable chips beneath the trigger.
 */
export function CollectionPicker({
  id,
  options,
  value,
  onChange,
  invalid,
  describedBy,
}: CollectionPickerProps) {
  const [open, setOpen] = useState(false);

  const selected = options.filter((option) => value.includes(option.id));

  function toggle(collectionId: string) {
    onChange(
      value.includes(collectionId)
        ? value.filter((current) => current !== collectionId)
        : [...value, collectionId],
    );
  }

  if (options.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        You have no collections yet. Create one from the top bar to file items
        into it.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Modal so the list scrolls and takes focus while it sits above the
          dialog or drawer, both of which lock scrolling outside themselves */}
      <Popover open={open} onOpenChange={setOpen} modal>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            aria-describedby={describedBy}
            className="justify-between font-normal"
          >
            <span className={selected.length ? "" : "text-muted-foreground"}>
              {selected.length === 0
                ? "Add to collections…"
                : `${selected.length} selected`}
            </span>
            <ChevronsUpDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-0"
        >
          <Command filter={matchName}>
            <CommandInput placeholder="Search collections…" />
            <CommandList>
              <CommandEmpty>No collection found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    keywords={[option.name]}
                    data-checked={value.includes(option.id)}
                    onSelect={() => toggle(option.id)}
                  >
                    <span className="truncate">{option.name}</span>
                    {/* cmdk owns aria-selected for the highlighted row, so
                        membership is announced in text instead */}
                    {value.includes(option.id) && (
                      <span className="sr-only">(selected)</span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <ul
          className="flex flex-wrap gap-1.5"
          aria-label="Selected collections"
        >
          {selected.map((option) => (
            <li key={option.id}>
              <Badge variant="secondary" className="h-6 max-w-60 gap-1 pr-1">
                <span className="truncate">{option.name}</span>
                <button
                  type="button"
                  onClick={() => toggle(option.id)}
                  className="rounded-sm p-0.5 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  aria-label={`Remove from ${option.name}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
