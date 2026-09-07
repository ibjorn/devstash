"use client";

import { File } from "lucide-react";

import { typeColorTint } from "@/lib/type-colors";
import { typeIcons } from "@/lib/type-icons";
import type { ItemTypeSummary } from "@/types/items";

/**
 * The tinted icon chip in the drawer header. Shared by the view and edit modes
 * so the drawer's identity doesn't shift when it flips between them.
 */
export function ItemTypeIcon({ type }: { type: ItemTypeSummary }) {
  // Looked up from the table rather than through getTypeIcon(): assigning a
  // component to a local at the top level of a component trips
  // react-hooks/static-components, which is why ItemRow does the same.
  const Icon = typeIcons[type.icon] ?? File;

  return (
    <div
      className="flex size-10 shrink-0 items-center justify-center rounded-lg"
      style={{
        backgroundColor: typeColorTint(type.color, 10),
        color: type.color,
      }}
    >
      <Icon className="size-5" />
    </div>
  );
}
