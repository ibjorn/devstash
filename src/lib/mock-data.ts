export type ItemContentType = "TEXT" | "FILE" | "URL";

export interface User {
  id: string;
  name: string;
  email: string;
  image: string | null;
  isPro: boolean;
}

export interface ItemType {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  contentType: ItemContentType;
  isSystem: boolean;
  count: number;
}

export interface Collection {
  id: string;
  name: string;
  description: string | null;
  itemCount: number;
  isFavorite: boolean;
  defaultTypeId: string | null;
  itemTypeIds: string[];
}

export interface Item {
  id: string;
  title: string;
  description: string | null;
  itemTypeId: string;
  contentType: ItemContentType;
  content: string | null;
  url: string | null;
  fileUrl: string | null;
  fileName: string | null;
  language: string | null;
  tags: string[];
  collectionIds: string[];
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const currentUser: User = {
  id: "user_1",
  name: "John Doe",
  email: "demo@devstash.io",
  image: null,
  isPro: true,
};

export const itemTypes: ItemType[] = [
  {
    id: "type_snippet",
    name: "Snippets",
    slug: "snippets",
    icon: "Code",
    color: "#3b82f6",
    contentType: "TEXT",
    isSystem: true,
    count: 24,
  },
  {
    id: "type_prompt",
    name: "Prompts",
    slug: "prompts",
    icon: "Sparkles",
    color: "#8b5cf6",
    contentType: "TEXT",
    isSystem: true,
    count: 18,
  },
  {
    id: "type_command",
    name: "Commands",
    slug: "commands",
    icon: "Terminal",
    color: "#f97316",
    contentType: "TEXT",
    isSystem: true,
    count: 15,
  },
  {
    id: "type_note",
    name: "Notes",
    slug: "notes",
    icon: "StickyNote",
    color: "#fde047",
    contentType: "TEXT",
    isSystem: true,
    count: 12,
  },
  {
    id: "type_file",
    name: "Files",
    slug: "files",
    icon: "File",
    color: "#6b7280",
    contentType: "FILE",
    isSystem: true,
    count: 5,
  },
  {
    id: "type_image",
    name: "Images",
    slug: "images",
    icon: "Image",
    color: "#ec4899",
    contentType: "FILE",
    isSystem: true,
    count: 3,
  },
  {
    id: "type_link",
    name: "Links",
    slug: "links",
    icon: "Link",
    color: "#10b981",
    contentType: "URL",
    isSystem: true,
    count: 8,
  },
];

export const collections: Collection[] = [
  {
    id: "col_react_patterns",
    name: "React Patterns",
    description: "Common React patterns and hooks",
    itemCount: 12,
    isFavorite: true,
    defaultTypeId: "type_snippet",
    itemTypeIds: ["type_snippet", "type_note", "type_link"],
  },
  {
    id: "col_python_snippets",
    name: "Python Snippets",
    description: "Useful Python code snippets",
    itemCount: 8,
    isFavorite: false,
    defaultTypeId: "type_snippet",
    itemTypeIds: ["type_snippet", "type_file"],
  },
  {
    id: "col_context_files",
    name: "Context Files",
    description: "AI context files for projects",
    itemCount: 5,
    isFavorite: true,
    defaultTypeId: "type_file",
    itemTypeIds: ["type_file", "type_note"],
  },
  {
    id: "col_interview_prep",
    name: "Interview Prep",
    description: "Technical interview preparation",
    itemCount: 24,
    isFavorite: false,
    defaultTypeId: "type_note",
    itemTypeIds: ["type_note", "type_snippet", "type_link", "type_image"],
  },
  {
    id: "col_git_commands",
    name: "Git Commands",
    description: "Frequently used git commands",
    itemCount: 15,
    isFavorite: true,
    defaultTypeId: "type_command",
    itemTypeIds: ["type_command", "type_note"],
  },
  {
    id: "col_ai_prompts",
    name: "AI Prompts",
    description: "Curated AI prompts for coding",
    itemCount: 18,
    isFavorite: false,
    defaultTypeId: "type_prompt",
    itemTypeIds: ["type_prompt", "type_snippet", "type_file"],
  },
];

export const items: Item[] = [
  {
    id: "item_useauth_hook",
    title: "useAuth Hook",
    description: "Custom authentication hook for React applications",
    itemTypeId: "type_snippet",
    contentType: "TEXT",
    content:
      "import { useContext } from 'react';\nimport { AuthContext } from './AuthContext';\n\nexport function useAuth() {\n  const ctx = useContext(AuthContext);\n  if (!ctx) throw new Error('useAuth must be used within AuthProvider');\n  return ctx;\n}",
    url: null,
    fileUrl: null,
    fileName: null,
    language: "typescript",
    tags: ["react", "auth", "hooks"],
    collectionIds: ["col_react_patterns", "col_interview_prep"],
    isFavorite: true,
    isPinned: true,
    createdAt: "2026-01-15T10:00:00Z",
    updatedAt: "2026-01-15T10:00:00Z",
  },
  {
    id: "item_api_error_pattern",
    title: "API Error Handling Pattern",
    description: "Fetch wrapper with exponential backoff retry logic",
    itemTypeId: "type_snippet",
    contentType: "TEXT",
    content:
      "export async function fetchWithRetry(url: string, opts?: RequestInit, retries = 3): Promise<Response> {\n  for (let i = 0; i < retries; i++) {\n    try {\n      const res = await fetch(url, opts);\n      if (res.ok) return res;\n    } catch (e) {\n      if (i === retries - 1) throw e;\n    }\n    await new Promise((r) => setTimeout(r, 2 ** i * 200));\n  }\n  throw new Error('fetchWithRetry failed');\n}",
    url: null,
    fileUrl: null,
    fileName: null,
    language: "typescript",
    tags: ["api", "error-handling", "fetch"],
    collectionIds: ["col_react_patterns"],
    isFavorite: false,
    isPinned: true,
    createdAt: "2026-01-12T09:00:00Z",
    updatedAt: "2026-01-12T09:00:00Z",
  },
  {
    id: "item_git_reset_soft",
    title: "Undo last commit (keep changes)",
    description: "Soft reset to undo the last commit but keep changes staged",
    itemTypeId: "type_command",
    contentType: "TEXT",
    content: "git reset --soft HEAD~1",
    url: null,
    fileUrl: null,
    fileName: null,
    language: "bash",
    tags: ["git", "reset"],
    collectionIds: ["col_git_commands"],
    isFavorite: true,
    isPinned: false,
    createdAt: "2026-01-10T14:30:00Z",
    updatedAt: "2026-01-10T14:30:00Z",
  },
  {
    id: "item_code_reviewer_prompt",
    title: "Code Reviewer",
    description: "System prompt for thorough code review",
    itemTypeId: "type_prompt",
    contentType: "TEXT",
    content:
      "You are a senior engineer reviewing a pull request. Focus on: correctness, security, performance, readability. Be concise and cite line numbers.",
    url: null,
    fileUrl: null,
    fileName: null,
    language: null,
    tags: ["review", "system-prompt"],
    collectionIds: ["col_ai_prompts"],
    isFavorite: false,
    isPinned: false,
    createdAt: "2026-01-08T11:20:00Z",
    updatedAt: "2026-01-08T11:20:00Z",
  },
  {
    id: "item_react_docs_link",
    title: "React Docs — useEffect",
    description: "Official documentation for the useEffect hook",
    itemTypeId: "type_link",
    contentType: "URL",
    content: null,
    url: "https://react.dev/reference/react/useEffect",
    fileUrl: null,
    fileName: null,
    language: null,
    tags: ["react", "docs"],
    collectionIds: ["col_react_patterns"],
    isFavorite: false,
    isPinned: false,
    createdAt: "2026-01-05T08:00:00Z",
    updatedAt: "2026-01-05T08:00:00Z",
  },
  {
    id: "item_project_context_md",
    title: "Project Context",
    description: "Master context file for project AI sessions",
    itemTypeId: "type_file",
    contentType: "FILE",
    content: null,
    url: null,
    fileUrl: "https://r2.example.com/files/project-context.md",
    fileName: "project-context.md",
    language: null,
    tags: ["context", "ai"],
    collectionIds: ["col_context_files"],
    isFavorite: true,
    isPinned: false,
    createdAt: "2026-01-03T16:45:00Z",
    updatedAt: "2026-01-03T16:45:00Z",
  },
  {
    id: "item_big_o_note",
    title: "Big-O Cheatsheet",
    description: "Quick reference for common time complexities",
    itemTypeId: "type_note",
    contentType: "TEXT",
    content:
      "# Big-O Cheatsheet\n\n- Array access: O(1)\n- Hash map lookup: O(1) avg\n- Binary search: O(log n)\n- Sort: O(n log n)\n- Nested loops: O(n²)",
    url: null,
    fileUrl: null,
    fileName: null,
    language: "markdown",
    tags: ["algorithms", "interview"],
    collectionIds: ["col_interview_prep"],
    isFavorite: false,
    isPinned: false,
    createdAt: "2026-01-02T12:00:00Z",
    updatedAt: "2026-01-02T12:00:00Z",
  },
];
