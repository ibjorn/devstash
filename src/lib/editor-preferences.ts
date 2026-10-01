import { z } from "zod";

// Import-free apart from Zod, so the settings form, the Monaco wrapper and the
// server all read the same option lists and defaults.

export const FONT_SIZES = [12, 13, 14, 16, 18] as const;
export const TAB_SIZES = [2, 4, 8] as const;
export const EDITOR_THEMES = ["vs-dark", "monokai", "github-dark"] as const;

export type EditorTheme = (typeof EDITOR_THEMES)[number];

export const EDITOR_THEME_LABELS: Record<EditorTheme, string> = {
  "vs-dark": "VS Dark",
  monokai: "Monokai",
  "github-dark": "GitHub Dark",
};

// Matches how CodeEditor looked before preferences existed
export const DEFAULT_EDITOR_PREFERENCES = {
  fontSize: 12,
  tabSize: 2,
  wordWrap: true,
  minimap: false,
  theme: "vs-dark",
} as const satisfies {
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  theme: EditorTheme;
};

const fontSize = z.literal(FONT_SIZES, "Choose a listed font size");
const tabSize = z.literal(TAB_SIZES, "Choose a listed tab size");
const theme = z.enum(EDITOR_THEMES, "Choose a listed theme");

/** What a write must look like: every field, each one of the listed values. */
export const editorPreferencesSchema = z.object({
  fontSize,
  tabSize,
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  theme,
});

export type EditorPreferences = z.infer<typeof editorPreferencesSchema>;

const D = DEFAULT_EDITOR_PREFERENCES;

// Stored JSON is null until the first change and may predate an option being
// removed, so each field falls back to its default on its own rather than one
// bad field discarding the rest
const storedPreferencesSchema = z
  .object({
    fontSize: fontSize.catch(D.fontSize),
    tabSize: tabSize.catch(D.tabSize),
    wordWrap: z.boolean().catch(D.wordWrap),
    minimap: z.boolean().catch(D.minimap),
    theme: theme.catch(D.theme),
  })
  .catch({ ...D });

export function parseEditorPreferences(value: unknown): EditorPreferences {
  return storedPreferencesSchema.parse(value ?? {});
}

/** Monaco's line height for a font size; 12px keeps the original 20px. */
export function editorLineHeight(fontSize: number): number {
  return Math.round((fontSize * 5) / 3);
}
