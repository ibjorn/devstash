"use client";

import { Check, Loader2, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiSuggestion } from "@/hooks/use-ai-suggestion";
import { parseTagInput } from "@/lib/validation/items";

/** The parts of the form's draft the model tags from. */
export interface TagDraft {
  typeName: string;
  title: string;
  content: string;
  language: string;
}

interface SuggestTagsProps {
  draft: TagDraft;
  /** The form's comma-separated tags input, as typed. */
  tags: string;
  onAccept: (tag: string) => void;
}

interface TagRequestBody extends Omit<TagDraft, "language"> {
  language: string | null;
  existingTags: string[];
}

/**
 * The Suggest Tags button and the chips it produces, each with accept and
 * reject. Accepting only writes into the form; Save still persists it. Only
 * rendered for Pro users — /api/ai/tags refuses everyone else regardless.
 */
export function SuggestTags({ draft, tags, onAccept }: SuggestTagsProps) {
  const { request, pending } = useAiSuggestion<
    TagRequestBody,
    { tags: string[] }
  >("/api/ai/tags");
  // null until asked; [] once an answer had nothing new in it
  const [suggestions, setSuggestions] = useState<string[] | null>(null);

  const current = parseTagInput(tags);
  const has = new Set(current.map((tag) => tag.toLocaleLowerCase()));
  // A tag typed in by hand since the answer arrived is no longer a suggestion
  const visible = suggestions?.filter((tag) => !has.has(tag)) ?? [];
  const canAsk =
    !pending && (draft.title.trim() !== "" || draft.content.trim() !== "");

  async function handleSuggest() {
    const result = await request({
      typeName: draft.typeName,
      title: draft.title,
      content: draft.content,
      language: draft.language || null,
      existingTags: current,
    });
    if (result) setSuggestions(result.tags);
  }

  function dismiss(tag: string) {
    // Emptied by the user, not by the model — so not "nothing to suggest"
    setSuggestions((list) => {
      const rest = list?.filter((item) => item !== tag) ?? [];
      return rest.length > 0 ? rest : null;
    });
  }

  function accept(tag: string) {
    onAccept(tag);
    dismiss(tag);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleSuggest}
        disabled={!canAsk}
        title="Sends this item's title and content to OpenAI"
      >
        {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {pending ? "Suggesting…" : "Suggest Tags"}
      </Button>

      {suggestions?.length === 0 && !pending && (
        <p className="text-xs text-muted-foreground">No new tags to suggest.</p>
      )}

      {visible.map((tag) => (
        <Badge
          key={tag}
          variant="outline"
          className="h-6 gap-0.5 border-dashed pr-0.5"
        >
          {tag}
          <button
            type="button"
            onClick={() => accept(tag)}
            aria-label={`Add tag ${tag}`}
            className="ml-1 inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground pointer-coarse:size-7"
          >
            <Check className="size-3" />
          </button>
          <button
            type="button"
            onClick={() => dismiss(tag)}
            aria-label={`Dismiss suggested tag ${tag}`}
            className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground pointer-coarse:size-7"
          >
            <X className="size-3" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
