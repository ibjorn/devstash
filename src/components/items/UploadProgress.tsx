import { Loader2 } from "lucide-react";

interface UploadProgressProps {
  fileName: string;
  /** 0–100 */
  percent: number;
}

/** An upload in flight: spinner, name, percentage and a progress bar. */
export function UploadProgress({ fileName, percent }: UploadProgressProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/40 p-3">
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate">{fileName}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Uploading ${fileName}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
