"use client";

import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface EditorWindowHeaderProps {
  /** The text the copy button copies. */
  value: string;
  copyLabel: string;
  /** Sits left of the copy button: a language label, or the Write/Preview tabs. */
  children?: React.ReactNode;
}

/**
 * The macOS-style title bar CodeEditor and MarkdownEditor share: traffic-light
 * dots on the left, a label slot and a quick copy on the right.
 */
export function EditorWindowHeader({
  value,
  copyLabel,
  children,
}: EditorWindowHeaderProps) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex min-w-0 items-center gap-1">
        {children}
        <Button
          // Sits inside the item forms; without this it would submit them
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => copy(value)}
          disabled={!value}
          aria-label={copyLabel}
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </div>
  );
}
