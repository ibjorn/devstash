import { File as FileIcon, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/uploads";

interface UploadedFilePreviewProps {
  name: string;
  size: number;
  /** A local object URL for an image, or null to show a generic file icon. */
  previewUrl: string | null;
  onRemove: () => void;
}

/** A finished upload: thumbnail or file icon, name, size and a Remove button. */
export function UploadedFilePreview({
  name,
  size,
  previewUrl,
  onRemove,
}: UploadedFilePreviewProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
      {previewUrl ? (
        // A local object URL; next/image can't optimise a blob: source
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="size-14 rounded-md border object-cover"
        />
      ) : (
        <div className="flex size-14 items-center justify-center rounded-md border bg-background">
          <FileIcon className="size-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">
          {formatBytes(size)} · uploaded
        </span>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        aria-label={`Remove ${name}`}
      >
        <X className="size-4" />
      </Button>
    </div>
  );
}
