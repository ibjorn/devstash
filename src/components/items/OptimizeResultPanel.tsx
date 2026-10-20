"use client";

import { Check, Loader2 } from "lucide-react";

import { PendingButton } from "@/components/forms/PendingButton";
import { Button } from "@/components/ui/button";

export interface OptimizeResult {
  prompt: string;
  changes: string[];
  unchanged: boolean;
}

interface OptimizeResultPanelProps {
  /** The optimizer request is in flight. */
  pending: boolean;
  result: OptimizeResult | null;
  /** The accepted rewrite is being saved. */
  saving: boolean;
  onUse: () => void;
  onDiscard: () => void;
}

/**
 * Below the prompt window: progress while the optimizer runs, then either
 * "already in good shape" or the list of changes with Use / Discard.
 */
export function OptimizeResultPanel({
  pending,
  result,
  saving,
  onUse,
  onDiscard,
}: OptimizeResultPanelProps) {
  return (
    <div aria-live="polite">
      {pending ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Optimizing…
        </p>
      ) : result?.unchanged ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="size-4" />
          Already in good shape — no changes suggested.
        </p>
      ) : result ? (
        <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4">
          {result.changes.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {result.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted-foreground">
            Use the optimized prompt? It replaces the saved content.
          </p>
          <div className="flex gap-2">
            <PendingButton
              pending={saving}
              type="button"
              size="sm"
              onClick={onUse}
            >
              Use optimized prompt
            </PendingButton>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDiscard}
              disabled={saving}
            >
              Discard
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
