"use client";

import { File } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { typeColorTint } from "@/lib/type-colors";
import { typeIcons } from "@/lib/type-icons";
import { cn } from "@/lib/utils";
import type { CreatableItemType } from "@/types/items";

interface ItemTypePickerProps {
  types: CreatableItemType[];
  value: string | undefined;
  onChange: (typeId: string) => void;
  disabled?: boolean;
}

/**
 * The New Item dialog's row of colour-tinted type buttons. `aria-pressed`
 * toggles rather than `role="radio"`, which would promise arrow-key behaviour
 * these buttons don't have.
 */
export function ItemTypePicker({
  types,
  value,
  onChange,
  disabled = false,
}: ItemTypePickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label id="new-item-type-label">Type</Label>
      <div
        role="group"
        aria-labelledby="new-item-type-label"
        className="flex flex-wrap gap-2"
      >
        {types.map((option) => {
          const Icon = typeIcons[option.icon] ?? File;
          const selected = option.id === value;
          return (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              size="sm"
              aria-pressed={selected}
              onClick={() => onChange(option.id)}
              disabled={disabled}
              className={cn(!selected && "text-muted-foreground")}
              style={
                selected
                  ? {
                      borderColor: option.color,
                      backgroundColor: typeColorTint(option.color, 10),
                    }
                  : undefined
              }
            >
              <Icon className="size-4" style={{ color: option.color }} />
              {option.name}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
