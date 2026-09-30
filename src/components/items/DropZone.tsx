"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

import { formatBytes, UPLOAD_RULES, type UploadKind } from "@/lib/uploads";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  /** The id of the hidden file input this label opens. */
  inputId: string;
  kind: UploadKind;
  invalid: boolean;
  onFiles: (files: FileList | null) => void;
}

/**
 * The empty upload target: a label for the visually hidden file input, so a
 * click browses, and a drop target for dragged files.
 */
export function DropZone({ inputId, kind, invalid, onFiles }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);

  const rule = UPLOAD_RULES[kind];
  const extensions = Object.keys(rule.extensions).join(", ");

  return (
    <label
      htmlFor={inputId}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        onFiles(event.dataTransfer.files);
      }}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center transition-colors hover:bg-muted/40",
        dragging && "border-primary bg-muted/40",
        invalid && "border-destructive",
      )}
    >
      <Upload className="size-6 text-muted-foreground" />
      <span className="text-sm">
        Drop {kind === "image" ? "an image" : "a file"} here, or{" "}
        <span className="font-medium underline underline-offset-4">browse</span>
      </span>
      <span className="text-xs text-muted-foreground">
        {extensions} · up to {formatBytes(rule.maxBytes)}
      </span>
    </label>
  );
}
