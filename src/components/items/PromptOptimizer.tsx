"use client";

import { Loader2, RotateCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { updateItem } from "@/actions/items";
import { AiProLock } from "@/components/items/AiProLock";
import { EditorTabs } from "@/components/items/EditorTabs";
import {
  MarkdownEditor,
  MarkdownPreview,
} from "@/components/items/MarkdownEditor";
import {
  OptimizeResultPanel,
  type OptimizeResult,
} from "@/components/items/OptimizeResultPanel";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { useActionRunner } from "@/hooks/use-action-runner";
import { useAiSuggestion } from "@/hooks/use-ai-suggestion";
import { updateInputFrom } from "@/lib/item-update";
import type { ItemDetail } from "@/types/items";

interface OptimizeRequestBody {
  title: string;
  content: string;
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
  const { pending: saving, run } = useActionRunner();

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
    const saved = await run(
      () =>
        updateItem(
          detail.id,
          updateInputFrom(detail, { content: suggestion.prompt }),
        ),
      {
        failed: "Could not save the optimized prompt.",
        unreachable: "Could not reach the server — the prompt was not changed.",
      },
    );
    if (!saved?.data) return;

    toast.success("Prompt updated");
    setResult(null);
    onSaved(saved.data);
    // The cards behind the drawer are server-rendered
    router.refresh();
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
                <EditorTabs
                  tabs={[
                    { value: "original", label: "Original" },
                    { value: "optimized", label: "Optimized" },
                  ]}
                />
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

      <OptimizeResultPanel
        pending={pending}
        result={result}
        saving={saving}
        onUse={handleUse}
        onDiscard={() => setResult(null)}
      />
    </div>
  );
}
