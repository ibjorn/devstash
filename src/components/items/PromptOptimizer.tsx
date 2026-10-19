"use client";

import { Check, Loader2, RotateCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateItem } from "@/actions/items";
import { AiProLock } from "@/components/items/AiProLock";
import {
  MarkdownEditor,
  MarkdownPreview,
} from "@/components/items/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAiSuggestion } from "@/hooks/use-ai-suggestion";
import type { ItemDetail } from "@/types/items";

interface OptimizeRequestBody {
  title: string;
  content: string;
}

interface OptimizeResult {
  prompt: string;
  changes: string[];
  unchanged: boolean;
}

interface PromptOptimizerProps {
  detail: ItemDetail;
  /** The saved prompt; the drawer only renders this when there is one. */
  content: string;
  aiEnabled: boolean;
  onSaved: (updated: ItemDetail) => void;
}

/**
 * The drawer's read-only prompt view with an AI Optimize button in the window
 * header. A suggested rewrite gets Original / Optimized tabs and a list of
 * what changed, and is only saved when the user chooses to use it — through
 * updateItem, with every other field as it was. Free users get a Crown that
 * leads to /upgrade; /api/ai/optimize refuses them regardless.
 */
export function PromptOptimizer({
  detail,
  content,
  aiEnabled,
  onSaved,
}: PromptOptimizerProps) {
  const router = useRouter();
  const { request, pending } = useAiSuggestion<
    OptimizeRequestBody,
    OptimizeResult
  >("/api/ai/optimize");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [tab, setTab] = useState("optimized");
  const [saving, setSaving] = useState(false);

  const suggestion = result && !result.unchanged ? result : null;
  const showOptimized = suggestion !== null && tab === "optimized";

  async function handleOptimize() {
    const next = await request({ title: detail.title, content });
    if (!next) return;
    setResult(next);
    setTab("optimized");
  }

  async function handleUse() {
    if (!suggestion) return;
    setSaving(true);
    try {
      const saved = await updateItem(detail.id, {
        title: detail.title,
        description: detail.description,
        content: suggestion.prompt,
        language: detail.language,
        url: detail.url,
        tags: detail.tags,
        collectionIds: detail.collections.map((collection) => collection.id),
      });
      if (!saved.success || !saved.data) {
        toast.error(saved.error ?? "Could not save the optimized prompt.");
        return;
      }
      toast.success("Prompt updated");
      setResult(null);
      onSaved(saved.data);
      // The cards behind the drawer are server-rendered
      router.refresh();
    } catch {
      toast.error("Could not reach the server — the prompt was not changed.");
    } finally {
      setSaving(false);
    }
  }

  const action = !aiEnabled ? (
    <AiProLock label="Optimize prompt" />
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={handleOptimize}
      disabled={pending || saving}
      aria-label={result ? "Optimize again" : "Optimize prompt"}
      title={
        result
          ? "Optimize again"
          : "Optimize with AI — sends this prompt to OpenAI"
      }
    >
      {pending ? (
        <Loader2 className="animate-spin" />
      ) : result ? (
        <RotateCw />
      ) : (
        <Sparkles />
      )}
    </Button>
  );

  return (
    <div className="flex flex-col gap-3">
      <Tabs value={tab} onValueChange={setTab} className="gap-0">
        <MarkdownEditor
          value={content}
          readOnly
          ariaLabel={`${detail.title} (rendered Markdown)`}
          headerActions={
            <>
              {suggestion && (
                <TabsList variant="line" className="h-6! p-0">
                  <TabsTrigger value="original" className="px-2 text-xs">
                    Original
                  </TabsTrigger>
                  <TabsTrigger value="optimized" className="px-2 text-xs">
                    Optimized
                  </TabsTrigger>
                </TabsList>
              )}
              {action}
            </>
          }
          alternate={
            showOptimized
              ? {
                  content: (
                    <MarkdownPreview
                      value={suggestion.prompt}
                      editing={false}
                    />
                  ),
                  copyValue: suggestion.prompt,
                  copyLabel: "Copy optimized prompt",
                }
              : null
          }
        />
      </Tabs>

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
        ) : suggestion ? (
          <div className="flex flex-col gap-3 rounded-lg border bg-muted/40 p-4">
            {suggestion.changes.length > 0 && (
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {suggestion.changes.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            )}
            <p className="text-sm text-muted-foreground">
              Use the optimized prompt? It replaces the saved content.
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleUse}
                disabled={saving}
              >
                {saving && <Loader2 className="animate-spin" />}
                Use optimized prompt
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setResult(null)}
                disabled={saving}
              >
                Discard
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
