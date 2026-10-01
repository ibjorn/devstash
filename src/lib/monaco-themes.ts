import type { Monaco } from "@monaco-editor/react";

import type { EditorTheme } from "@/lib/editor-preferences";

// Monaco draws its own scrollbars, so CSS can't theme them; every theme gets
// the same quiet slider and no focus outline (the window frame shows focus)
const SHARED_COLORS = {
  "editor.lineHighlightBorder": "#00000000",
  "scrollbarSlider.background": "#ffffff1a",
  "scrollbarSlider.hoverBackground": "#ffffff33",
  "scrollbarSlider.activeBackground": "#ffffff4d",
  "scrollbar.shadow": "#00000000",
  focusBorder: "#00000000",
};

/** The Monaco theme id registered for each preference value. */
export const MONACO_THEME_IDS: Record<EditorTheme, string> = {
  "vs-dark": "devstash-dark",
  monokai: "devstash-monokai",
  "github-dark": "devstash-github-dark",
};

/**
 * Registers every selectable theme. Monaco only ships vs, vs-dark and hc-*,
 * so Monokai and GitHub Dark are defined here by hand rather than pulled in
 * from a theme package.
 */
export function defineEditorThemes(monaco: Monaco) {
  // "VS Dark" keeps vs-dark's syntax colours but restates the dark-theme
  // tokens in globals.css (--card is oklch(0.205 0 0) = #171717), so the
  // editor sits flush with bg-card. Monaco needs hex, so it can't read oklch.
  monaco.editor.defineTheme(MONACO_THEME_IDS["vs-dark"], {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      ...SHARED_COLORS,
      "editor.background": "#171717",
      "editorGutter.background": "#171717",
      "editor.lineHighlightBackground": "#ffffff08",
      "editorLineNumber.foreground": "#525252",
      "editorLineNumber.activeForeground": "#a3a3a3",
    },
  });

  monaco.editor.defineTheme(MONACO_THEME_IDS.monokai, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "f8f8f2" },
      { token: "comment", foreground: "75715e", fontStyle: "italic" },
      { token: "string", foreground: "e6db74" },
      { token: "number", foreground: "ae81ff" },
      { token: "constant", foreground: "ae81ff" },
      { token: "regexp", foreground: "e6db74" },
      { token: "keyword", foreground: "f92672" },
      { token: "operator", foreground: "f92672" },
      { token: "type", foreground: "66d9ef", fontStyle: "italic" },
      { token: "identifier", foreground: "f8f8f2" },
      { token: "function", foreground: "a6e22e" },
      { token: "variable", foreground: "f8f8f2" },
      { token: "delimiter", foreground: "f8f8f2" },
      { token: "tag", foreground: "f92672" },
      { token: "attribute.name", foreground: "a6e22e" },
      { token: "attribute.value", foreground: "e6db74" },
      { token: "metatag", foreground: "f92672" },
    ],
    colors: {
      ...SHARED_COLORS,
      "editor.background": "#272822",
      "editor.foreground": "#f8f8f2",
      "editorGutter.background": "#272822",
      "editor.lineHighlightBackground": "#3e3d3260",
      "editor.selectionBackground": "#49483e",
      "editorCursor.foreground": "#f8f8f0",
      "editorLineNumber.foreground": "#75715e",
      "editorLineNumber.activeForeground": "#c2c2bf",
      "editorIndentGuide.background1": "#3b3a32",
    },
  });

  // GitHub's Primer dark palette
  monaco.editor.defineTheme(MONACO_THEME_IDS["github-dark"], {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "e6edf3" },
      { token: "comment", foreground: "8b949e", fontStyle: "italic" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "constant", foreground: "79c0ff" },
      { token: "regexp", foreground: "7ee787" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "operator", foreground: "ff7b72" },
      { token: "type", foreground: "ffa657" },
      { token: "identifier", foreground: "e6edf3" },
      { token: "function", foreground: "d2a8ff" },
      { token: "variable", foreground: "ffa657" },
      { token: "delimiter", foreground: "e6edf3" },
      { token: "tag", foreground: "7ee787" },
      { token: "attribute.name", foreground: "79c0ff" },
      { token: "attribute.value", foreground: "a5d6ff" },
      { token: "metatag", foreground: "ff7b72" },
    ],
    colors: {
      ...SHARED_COLORS,
      "editor.background": "#0d1117",
      "editor.foreground": "#e6edf3",
      "editorGutter.background": "#0d1117",
      "editor.lineHighlightBackground": "#6e76811a",
      "editor.selectionBackground": "#264f78",
      "editorCursor.foreground": "#e6edf3",
      "editorLineNumber.foreground": "#6e7681",
      "editorLineNumber.activeForeground": "#e6edf3",
      "editorIndentGuide.background1": "#21262d",
    },
  });
}
