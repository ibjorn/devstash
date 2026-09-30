"use client";

import { useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { EditorWindowHeader } from "@/components/items/EditorWindowHeader";
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
  const header = (
    <EditorWindowHeader value={value} copyLabel="Copy markdown">
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
    </EditorWindowHeader>
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
