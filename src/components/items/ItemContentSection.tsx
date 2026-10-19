"use client";

import { CodeExplainer } from "@/components/items/CodeExplainer";
import { DrawerSection } from "@/components/items/DrawerSection";
import { MarkdownEditor } from "@/components/items/MarkdownEditor";
import { isCodeType, isMarkdownType } from "@/lib/code-language";
import type { ItemDetail } from "@/types/items";

interface ItemContentSectionProps {
  detail: ItemDetail;
  /** Pro access: a working Explain button on code, or the Pro lock. */
  aiEnabled: boolean;
}

/**
 * The drawer's Content section: Monaco for code types, rendered Markdown for
 * notes and prompts, and plain text for everything else — which is how a
 * link's URL shows up. Renders nothing when there's no content at all.
 */
export function ItemContentSection({
  detail,
  aiEnabled,
}: ItemContentSectionProps) {
  const typeName = detail.type.name;

  // Only real content goes in the editors; a link's URL fallback stays plain
  if (detail.content && isCodeType(typeName)) {
    return (
      <DrawerSection title="Content">
        {/* Keyed so another item never inherits this one's explanation */}
        <CodeExplainer
          key={detail.id}
          typeName={typeName}
          title={detail.title}
          value={detail.content}
          language={detail.language}
          ariaLabel={`${detail.title} (read-only)`}
          aiEnabled={aiEnabled}
        />
      </DrawerSection>
    );
  }

  if (detail.content && isMarkdownType(typeName)) {
    return (
      <DrawerSection title="Content">
        <MarkdownEditor
          value={detail.content}
          readOnly
          ariaLabel={`${detail.title} (rendered Markdown)`}
        />
      </DrawerSection>
    );
  }

  const text = detail.content ?? detail.url;
  if (!text) return null;

  return (
    <DrawerSection title="Content">
      <pre className="max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap">
        {text}
      </pre>
    </DrawerSection>
  );
}
