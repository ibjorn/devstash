"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useAiSuggestion } from "@/hooks/use-ai-suggestion";
import { parseTagInput } from "@/lib/validation/items";

/** The parts of the form's draft the model describes from. */
export interface SummaryDraft {
  typeName: string;
  title: string;
  content: string;
  language: string;
  url: string;
  fileName: string;
  /** The form's comma-separated tags input, as typed. */
  tags: string;
}

interface SummaryRequestBody {
  typeName: string;
  title: string;
  content: string;
  language: string | null;
  url: string | null;
  fileName: string | null;
  tags: string[];
}

interface SummarizeDescriptionProps {
  draft: SummaryDraft;
  description: string;
  onChange: (description: string) => void;
}

/**
 * The icon button beside Description that fills it with an AI summary of the
 * current draft, plus an Undo while the replaced text is still recoverable.
 * Only writes into the form; Save still persists it. Only rendered for Pro
 * users — /api/ai/summary refuses everyone else regardless.
 */
export function SummarizeDescription({
  draft,
  description,
  onChange,
}: SummarizeDescriptionProps) {
  const { request, pending } = useAiSuggestion<
    SummaryRequestBody,
    { summary: string }
  >("/api/ai/summary");
  // What the summary replaced, and the summary itself: Undo is only offered
  // while the field still holds exactly what the AI put there
  const [undo, setUndo] = useState<{ previous: string; summary: string } | null>(
    null,
  );

  const canAsk =
    !pending &&
    [draft.title, draft.content, draft.url, draft.fileName].some(
      (value) => value.trim() !== "",
    );
  const canUndo = undo !== null && undo.summary === description;

  async function handleSummarize() {
    const result = await request({
      typeName: draft.typeName,
      title: draft.title,
      content: draft.content,
      language: draft.language || null,
      url: draft.url || null,
      fileName: draft.fileName || null,
      tags: parseTagInput(draft.tags),
    });
    if (!result) return;

    setUndo(
      description.trim()
        ? { previous: description, summary: result.summary }
        : null,
    );
    onChange(result.summary);
  }

  function handleUndo() {
    if (!undo) return;
    onChange(undo.previous);
    setUndo(null);
  }

  return (
    <div className="flex items-center gap-1">
      {canUndo && (
        <Button
          type="button"
          variant="link"
          size="sm"
          onClick={handleUndo}
          className="h-auto px-1 text-xs text-muted-foreground"
        >
          Undo
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleSummarize}
        disabled={!canAsk}
        aria-label="Generate description with AI"
        title="Generate description with AI — sends this item's details to OpenAI"
        className="size-7"
      >
        {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
      </Button>
    </div>
  );
}
