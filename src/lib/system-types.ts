// The seven system item types' icon and colour, keyed by singular name. The
// seed writes these to the ItemType table; the marketing homepage reads them
// directly, since it renders without a database query.
//
// Import-free so prisma/seed.ts and client components can both use it.
export const SYSTEM_TYPES = {
  Snippet: { icon: "Code", color: "#3b82f6" },
  Prompt: { icon: "Sparkles", color: "#8b5cf6" },
  Command: { icon: "Terminal", color: "#f97316" },
  Note: { icon: "StickyNote", color: "#fde047" },
  Link: { icon: "Link", color: "#10b981" },
  File: { icon: "File", color: "#6b7280" },
  Image: { icon: "Image", color: "#ec4899" },
} as const;

export type SystemTypeName = keyof typeof SYSTEM_TYPES;
