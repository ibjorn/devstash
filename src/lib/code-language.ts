// The system types that hold code: they get a language field and the Monaco
// editor. Keyed by name, so it only decides what the UI *offers*; the server's
// rule is contentType-based, so a custom text type is still allowed a language.
const CODE_TYPE_NAMES = new Set(["Snippet", "Command"]);

export function isCodeType(typeName: string): boolean {
  return CODE_TYPE_NAMES.has(typeName);
}

// Monaco language ids this app will ask for. Monaco ships more, but naming
// them here keeps the mapping explicit and testable; anything else renders as
// plain text rather than guessing.
const MONACO_LANGUAGES = new Set([
  "c",
  "cpp",
  "csharp",
  "css",
  "dockerfile",
  "go",
  "graphql",
  "html",
  "java",
  "javascript",
  "json",
  "kotlin",
  "markdown",
  "php",
  "plaintext",
  "powershell",
  "python",
  "ruby",
  "rust",
  "scss",
  "shell",
  "sql",
  "swift",
  "typescript",
  "xml",
  "yaml",
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

/** The Monaco language id for a free-text `Item.language`, or "plaintext". */
export function toMonacoLanguage(language: string | null | undefined): string {
  const key = language?.trim().toLowerCase();
  if (!key) return "plaintext";
  const id = Object.hasOwn(LANGUAGE_ALIASES, key) ? LANGUAGE_ALIASES[key] : key;
  return MONACO_LANGUAGES.has(id) ? id : "plaintext";
}
