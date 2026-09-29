"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// User content: links leave the app in a new tab without handing it a
// window.opener. react-markdown already drops raw HTML and javascript: URLs.
const COMPONENTS: Components = {
  a: ({ href, title, children }) => (
    <a href={href} title={title} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};

function MarkdownPreview({
  value,
  editing,
}: {
  value: string;
  editing: boolean;
}) {
  return (
    <div
      className={cn(
        "max-h-[400px] overflow-y-auto px-4 py-3",
        // Matches the Write tab's floor so switching tabs doesn't jump
        editing && "min-h-40",
      )}
    >
      {value.trim() ? (
        <div className="markdown-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={COMPONENTS}>
            {value}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Nothing to preview</p>
      )}
    </div>
  );
}

interface MarkdownEditorProps {
  value: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  /** Lets a form label and error text target the Write textarea. */
  id?: string;
  ariaLabel?: string;
  invalid?: boolean;
  describedBy?: string;
}

/**
 * Markdown for notes and prompts, in the same window frame as CodeEditor.
 * Read-only in the drawer (preview only); editable in the item forms, where it
 * opens on Write with a Preview tab. Grows with its content up to 400px.
 */
export function MarkdownEditor({
  value,
  readOnly = false,
  onChange,
  id,
  ariaLabel,
  invalid = false,
  describedBy,
}: MarkdownEditorProps) {
  const [tab, setTab] = useState("write");
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(copiedTimer.current), []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      toast.error("Could not copy — your browser blocked clipboard access");
      return;
    }
    toast.success("Copied to clipboard");
    setCopied(true);
    // Restart rather than stack, or an earlier click's timer cuts this one short
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  }

  const header = (
    <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
      <div className="flex items-center gap-1.5" aria-hidden>
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
      </div>
      <div className="flex min-w-0 items-center gap-1">
        {readOnly ? (
          <span className="font-mono text-xs text-muted-foreground">
            markdown
          </span>
        ) : (
          <TabsList variant="line" className="h-6! p-0">
            <TabsTrigger value="write" className="px-2 text-xs">
              Write
            </TabsTrigger>
            <TabsTrigger value="preview" className="px-2 text-xs">
              Preview
            </TabsTrigger>
          </TabsList>
        )}
        <Button
          // Sits inside the item forms; without this it would submit them
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          disabled={!value}
          aria-label="Copy markdown"
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
    </div>
  );

  const frame = cn(
    "overflow-hidden rounded-lg border bg-card",
    invalid && "border-destructive",
  );

  if (readOnly) {
    return (
      <div className={frame} role="group" aria-label={ariaLabel}>
        {header}
        <MarkdownPreview value={value} editing={false} />
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className={cn(frame, "gap-0")}>
      {header}
      <TabsContent value="write">
        <textarea
          id={id}
          name="content"
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          aria-label={ariaLabel}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="block field-sizing-content min-h-40 max-h-[400px] w-full resize-none bg-transparent px-4 py-3 font-mono text-xs leading-relaxed outline-none placeholder:text-muted-foreground"
          placeholder="Write in Markdown…"
        />
      </TabsContent>
      <TabsContent value="preview">
        <MarkdownPreview value={value} editing />
      </TabsContent>
    </Tabs>
  );
}
