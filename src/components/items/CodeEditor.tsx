"use client";

import { useState } from "react";
import Editor, {
  loader,
  type Monaco,
  type OnMount,
} from "@monaco-editor/react";

import { useEditorPreferences } from "@/components/editor/EditorPreferencesProvider";
import { EditorWindowHeader } from "@/components/items/EditorWindowHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { toMonacoLanguage } from "@/lib/code-language";
import { editorLineHeight } from "@/lib/editor-preferences";
import { MONACO_CDN_PATH } from "@/lib/monaco";
import { defineEditorThemes, MONACO_THEME_IDS } from "@/lib/monaco-themes";
import { cn } from "@/lib/utils";

loader.config({ paths: { vs: MONACO_CDN_PATH } });

const PADDING = 12;
const MAX_HEIGHT = 400;
// An empty editor is one line tall, which is too small a target to type into
const MIN_EDIT_HEIGHT = 160;

function beforeMount(monaco: Monaco) {
  defineEditorThemes(monaco);

  // A stash holds fragments — a snippet importing a module it can't resolve,
  // a half-finished function — so type-checking them is all red noise
  const diagnostics = { noSemanticValidation: true, noSyntaxValidation: true };
  monaco.typescript.typescriptDefaults.setDiagnosticsOptions(diagnostics);
  monaco.typescript.javascriptDefaults.setDiagnosticsOptions(diagnostics);
}

function estimateHeight(value: string, lineHeight: number) {
  return value.split("\n").length * lineHeight + PADDING * 2;
}

interface CodeEditorProps {
  value: string;
  /** The item's free-text language, shown as typed in the header. */
  language?: string | null;
  readOnly?: boolean;
  onChange?: (value: string) => void;
  ariaLabel: string;
  invalid?: boolean;
}

/**
 * Monaco in a macOS-style window: traffic-light dots, the language and a quick
 * copy in the header. Read-only in the drawer, editable in the item forms.
 * Grows with its content up to MAX_HEIGHT, then scrolls. Font size, tab size,
 * wrapping, minimap and theme come from the user's editor preferences.
 */
export function CodeEditor({
  value,
  language,
  readOnly = false,
  onChange,
  ariaLabel,
  invalid = false,
}: CodeEditorProps) {
  const { preferences } = useEditorPreferences();
  const lineHeight = editorLineHeight(preferences.fontSize);
  const [contentHeight, setContentHeight] = useState(() =>
    estimateHeight(value, lineHeight),
  );

  const height = Math.min(
    Math.max(contentHeight, readOnly ? 0 : MIN_EDIT_HEIGHT),
    MAX_HEIGHT,
  );

  // Monaco doesn't size itself to its content; follow it instead
  const handleMount: OnMount = (editor) => {
    setContentHeight(editor.getContentHeight());
    editor.onDidContentSizeChange((event) =>
      setContentHeight(event.contentHeight),
    );
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border bg-card",
        invalid && "border-destructive",
      )}
    >
      <EditorWindowHeader value={value} copyLabel="Copy code">
        {language && (
          <span className="truncate font-mono text-xs text-muted-foreground">
            {language}
          </span>
        )}
      </EditorWindowHeader>

      <Editor
        height={height}
        language={toMonacoLanguage(language)}
        value={value}
        theme={MONACO_THEME_IDS[preferences.theme]}
        beforeMount={beforeMount}
        onMount={handleMount}
        onChange={(next) => onChange?.(next ?? "")}
        loading={<Skeleton className="size-full rounded-none" />}
        options={{
          readOnly,
          domReadOnly: readOnly,
          ariaLabel,
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: preferences.fontSize,
          lineHeight,
          padding: { top: PADDING, bottom: PADDING },
          wordWrap: preferences.wordWrap ? "on" : "off",
          tabSize: preferences.tabSize,
          // Otherwise Monaco guesses the tab size from the content and the
          // preference only applies to an empty editor
          detectIndentation: false,
          minimap: { enabled: preferences.minimap },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          lineNumbersMinChars: 3,
          lineDecorationsWidth: 8,
          glyphMargin: false,
          folding: false,
          // Pins the enclosing scope's first line over the top once scrolled,
          // which in a 400px window reads as lines overlapping
          stickyScroll: { enabled: false },
          renderLineHighlight: readOnly ? "none" : "line",
          overviewRulerLanes: 0,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          contextmenu: !readOnly,
          // Suggestion popups get clipped by the editor's own bounds inside a
          // dialog, and word-based completions are noise in a snippet stash
          quickSuggestions: false,
          suggestOnTriggerCharacters: false,
          parameterHints: { enabled: false },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            useShadows: false,
            // Let the drawer or dialog scroll on once the editor hits its end
            alwaysConsumeMouseWheel: false,
          },
        }}
      />
    </div>
  );
}
