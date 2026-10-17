// The system types that hold code: they get a language field and the Monaco
// editor. Keyed by name, so it only decides what the UI *offers*; the server's
// rule is contentType-based, so a custom text type is still allowed a language.
const CODE_TYPE_NAMES = new Set(["Snippet", "Command"]);

export function isCodeType(typeName: string): boolean {
  return CODE_TYPE_NAMES.has(typeName);
}

// The prose types that get the Markdown editor and a rendered preview. Same
// name-keyed rule as above, so a custom text type falls back to the textarea.
const MARKDOWN_TYPE_NAMES = new Set(["Note", "Prompt"]);

export function isMarkdownType(typeName: string): boolean {
  return MARKDOWN_TYPE_NAMES.has(typeName);
}

export const PLAIN_TEXT = "plaintext";

// The languages the item forms offer, as Monaco ids with display labels.
// Monaco ships more, but naming them here keeps the mapping explicit and
// testable; anything else renders as plain text rather than guessing.
export const LANGUAGE_OPTIONS: ReadonlyArray<{ value: string; label: string }> =
  [
    { value: "c", label: "C" },
    { value: "cpp", label: "C++" },
    { value: "csharp", label: "C#" },
    { value: "css", label: "CSS" },
    { value: "dockerfile", label: "Dockerfile" },
    { value: "go", label: "Go" },
    { value: "graphql", label: "GraphQL" },
    { value: "html", label: "HTML" },
    { value: "java", label: "Java" },
    { value: "javascript", label: "JavaScript" },
    { value: "json", label: "JSON" },
    { value: "kotlin", label: "Kotlin" },
    { value: "markdown", label: "Markdown" },
    { value: "php", label: "PHP" },
    { value: "powershell", label: "PowerShell" },
    { value: "python", label: "Python" },
    { value: "ruby", label: "Ruby" },
    { value: "rust", label: "Rust" },
    { value: "scss", label: "SCSS" },
    { value: "shell", label: "Shell" },
    { value: "sql", label: "SQL" },
    { value: "swift", label: "Swift" },
    { value: "typescript", label: "TypeScript" },
    { value: "xml", label: "XML" },
    { value: "yaml", label: "YAML" },
  ];

const MONACO_LANGUAGES = new Set([
  PLAIN_TEXT,
  ...LANGUAGE_OPTIONS.map((option) => option.value),
]);

// What people actually type in the free-text language field, mapped to the id
// Monaco knows it by. Notably Monaco has no "bash" — every seeded command
// uses it, and it's "shell" there.
const LANGUAGE_ALIASES: Record<string, string> = {
  bash: "shell",
  sh: "shell",
  zsh: "shell",
  console: "shell",
  terminal: "shell",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  node: "javascript",
  ts: "typescript",
  tsx: "typescript",
  py: "python",
  yml: "yaml",
  md: "markdown",
  docker: "dockerfile",
  ps1: "powershell",
  pwsh: "powershell",
  rb: "ruby",
  rs: "rust",
  golang: "go",
  cs: "csharp",
  "c#": "csharp",
  "c++": "cpp",
  kt: "kotlin",
  htm: "html",
  postgres: "sql",
  postgresql: "sql",
  mysql: "sql",
};

// The Monaco id a lower-cased, trimmed language resolves to, or null if unknown
function knownLanguageId(key: string): string | null {
  const id = Object.hasOwn(LANGUAGE_ALIASES, key) ? LANGUAGE_ALIASES[key] : key;
  return MONACO_LANGUAGES.has(id) ? id : null;
}

/** The Monaco language id for a free-text `Item.language`, or "plaintext". */
export function toMonacoLanguage(language: string | null | undefined): string {
  const key = language?.trim().toLowerCase();
  if (!key) return PLAIN_TEXT;
  return knownLanguageId(key) ?? PLAIN_TEXT;
}

/**
 * The language dropdown option a stored `Item.language` selects: its Monaco id
 * when known (so "bash" selects Shell), "plaintext" when empty, and otherwise
 * the value itself, trimmed, which the dropdown offers as an extra option so
 * editing an item never silently drops a language the list doesn't know.
 */
export function languageOptionFor(language: string | null | undefined): string {
  const trimmed = language?.trim();
  if (!trimmed) return PLAIN_TEXT;
  return knownLanguageId(trimmed.toLowerCase()) ?? trimmed;
}
