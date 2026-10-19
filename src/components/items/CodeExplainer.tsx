"use client";

import { Crown, Loader2, RotateCw, Sparkles, Square } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CodeEditor } from "@/components/items/CodeEditor";
import { MarkdownPreview } from "@/components/items/MarkdownEditor";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAiStream } from "@/hooks/use-ai-stream";

interface ExplainRequestBody {
  typeName: string;
  title: string;
  content: string;
  language: string | null;
}

interface CodeExplainerProps {
  typeName: string;
  title: string;
  value: string;
  language: string | null;
  ariaLabel: string;
  aiEnabled: boolean;
}

function ProLock() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-xs" asChild>
          <Link href="/upgrade" aria-label="Explain code — requires Pro">
            <Crown />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>AI features require Pro subscription</TooltipContent>
    </Tooltip>
  );
}

/**
 * The drawer's read-only code view with an AI Explain button in the editor
 * header. Once asked, Code / Explain tabs switch the window between the code
 * and the streamed explanation. Nothing is saved: the explanation lives as
 * long as this component, which the drawer remounts per item. Free users get
 * a Crown that leads to /upgrade — /api/ai/explain refuses them regardless.
 */
export function CodeExplainer({
  typeName,
  title,
  value,
  language,
  ariaLabel,
  aiEnabled,
}: CodeExplainerProps) {
  const { text, streaming, start, stop } =
    useAiStream<ExplainRequestBody>("/api/ai/explain");
  const [tab, setTab] = useState("code");
  // Until a first answer starts there's nothing for the tabs to switch to
  const hasExplanation = streaming || text !== "";
  const showExplanation = hasExplanation && tab === "explain";

  function handleExplain() {
    setTab("explain");
    void start({ typeName, title, content: value, language });
  }

  const action = !aiEnabled ? (
    <ProLock />
  ) : streaming ? (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={stop}
      aria-label="Stop explaining"
      title="Stop"
    >
      <Square />
    </Button>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={handleExplain}
      aria-label={text ? "Regenerate explanation" : "Explain code"}
      title={
        text
          ? "Regenerate explanation"
          : "Explain with AI — sends this code to OpenAI"
      }
    >
      {text ? <RotateCw /> : <Sparkles />}
    </Button>
  );

  const explanation = (
    <div aria-live="polite" aria-busy={streaming}>
      {text ? (
        <MarkdownPreview value={text} editing={false} />
      ) : (
        <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Explaining…
        </div>
      )}
    </div>
  );

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-0">
      <CodeEditor
        value={value}
        language={language}
        readOnly
        ariaLabel={ariaLabel}
        headerActions={
          <>
            {hasExplanation && (
              <TabsList variant="line" className="h-6! p-0">
                <TabsTrigger value="code" className="px-2 text-xs">
                  Code
                </TabsTrigger>
                <TabsTrigger value="explain" className="px-2 text-xs">
                  Explain
                </TabsTrigger>
              </TabsList>
            )}
            {action}
          </>
        }
        alternate={
          showExplanation
            ? {
                content: explanation,
                copyValue: streaming ? "" : text,
                copyLabel: "Copy explanation",
              }
            : null
        }
      />
    </Tabs>
  );
}
