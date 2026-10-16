"use client";

import { File } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { typeColorTint } from "@/lib/type-colors";
import { typeIcons } from "@/lib/type-icons";
import { cn } from "@/lib/utils";
import type { NewItemTypeOption } from "@/types/items";

interface ItemTypePickerProps {
  types: NewItemTypeOption[];
  value: string | undefined;
  onChange: (typeId: string) => void;
  disabled?: boolean;
}

/**
 * The New Item dialog's row of colour-tinted type buttons. `aria-pressed`
 * toggles rather than `role="radio"`, which would promise arrow-key behaviour
 * these buttons don't have. A locked type stays selectable, so the dialog can
 * explain why it can't be used.
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
              {option.locked && (
                <Badge
                  variant="outline"
                  className="h-4 px-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground"
                >
                  PRO
                </Badge>
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
