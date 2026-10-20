import { Lock } from "lucide-react";
import Link from "next/link";

interface LockedTypeNoteProps {
  typeName: string;
  /** Runs before the Upgrade link navigates, so the dialog can close. */
  onUpgrade: () => void;
}

/** Shown in place of the upload field for a Pro-only type on a Free account. */
export function LockedTypeNote({ typeName, onUpgrade }: LockedTypeNoteProps) {
  return (
    <div className="flex items-start gap-3 rounded-md border p-3 text-sm">
      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p className="text-muted-foreground">
        {typeName} items are a Pro feature.{" "}
        <Link
          href="/upgrade"
          onClick={onUpgrade}
          className="font-medium text-foreground underline underline-offset-4"
        >
          Upgrade
        </Link>{" "}
        to upload files and images.
      </p>
    </div>
  );
}
