import { Download } from "lucide-react";

import { DrawerSection } from "@/components/items/DrawerSection";
import { Button } from "@/components/ui/button";
import { formatBytes, uploadKindFor } from "@/lib/uploads";
import type { ItemDetail } from "@/types/items";

interface ItemFileSectionProps {
  detail: ItemDetail;
}

/**
 * The drawer's File / Image section: a preview for images, then the file name,
 * size and a download link. Everything goes through the owner-checked proxy —
 * the stored key is private. Renders nothing for items without a file.
 */
export function ItemFileSection({ detail }: ItemFileSectionProps) {
  if (!detail.fileName) return null;

  const isImage = uploadKindFor(detail.type.name) === "image";
  const fileHref = `/api/items/${encodeURIComponent(detail.id)}/file`;

  return (
    <DrawerSection title={isImage ? "Image" : "File"}>
      {isImage && (
        // Served by the authenticated proxy; next/image's optimiser fetches
        // server-side without the session cookie, so it can't load it
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={fileHref}
          alt={detail.title}
          className="max-h-96 w-full rounded-lg border bg-muted/40 object-contain"
        />
      )}
      <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-3">
        <p className="min-w-0 truncate text-sm">
          {detail.fileName}
          {detail.fileSize !== null && (
            <span className="text-muted-foreground">
              {" "}
              · {formatBytes(detail.fileSize)}
            </span>
          )}
        </p>
        <Button variant="outline" size="sm" asChild>
          <a href={`${fileHref}?download=1`} download>
            <Download className="size-4" />
            Download
          </a>
        </Button>
      </div>
    </DrawerSection>
  );
}
