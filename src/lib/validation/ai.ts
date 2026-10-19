import { z } from "zod";

// AI requests carry the form's draft, not an item id: suggestions are wanted
// before an item exists, and while editing the saved row is stale. The draft
// and the answer both belong to the caller, so there is no ownership to check —
// only bounds. Content is capped here at the item limit and truncated to each
// feature's much smaller input cap server-side, never rejected for length.
const CONTENT_MAX = 100_000;

export const tagRequestSchema = z
  .object({
    // "Snippet", "Prompt"… gives the model context
    typeName: z.string().trim().min(1).max(50),
    title: z.string().trim().max(200, "Title is too long"),
    content: z.string().max(CONTENT_MAX, "Content is too long").default(""),
    language: z.string().trim().max(50).nullable().default(null),
    // So it suggests new tags rather than ones the item already has
    existingTags: z.array(z.string().max(50)).max(20).default([]),
  })
  .refine(
    (draft) => draft.title.length > 0 || draft.content.trim().length > 0,
    "Add a title or some content first.",
  );

export type TagRequest = z.infer<typeof tagRequestSchema>;

export const summaryRequestSchema = z
  .object({
    typeName: z.string().trim().min(1).max(50),
    title: z.string().trim().max(200, "Title is too long"),
    content: z.string().max(CONTENT_MAX, "Content is too long").default(""),
    language: z.string().trim().max(50).nullable().default(null),
    // A link or a file may have little else to go on
    url: z.string().trim().max(2048).nullable().default(null),
    fileName: z.string().trim().max(255).nullable().default(null),
    // Context only — they hint at the topic
    tags: z.array(z.string().max(50)).max(20).default([]),
  })
  .refine(
    (draft) =>
      draft.title.length > 0 ||
      draft.content.trim().length > 0 ||
      Boolean(draft.url) ||
      Boolean(draft.fileName),
    "Add a title or some content first.",
  );

export type SummaryRequest = z.infer<typeof summaryRequestSchema>;

// Explain is offered on the drawer's read view of a saved code item, so there
// is always content — and only the two code types are worth explaining
export const explainRequestSchema = z.object({
  typeName: z.enum(["Snippet", "Command"]),
  title: z.string().trim().max(200, "Title is too long"),
  content: z
    .string()
    .max(CONTENT_MAX, "Content is too long")
    .refine((content) => content.trim().length > 0, "Nothing to explain."),
  language: z.string().trim().max(50).nullable().default(null),
});

export type ExplainRequest = z.infer<typeof explainRequestSchema>;

/** The optimizer's input cap — rejected past it, never cut: the answer replaces the whole prompt. */
export const OPTIMIZE_INPUT_MAX = 20_000;

// Optimize is offered on the drawer's read view of a saved prompt, so there is
// always content. Unlike the other features it can't truncate: accepting the
// answer overwrites the item, and a cut prompt would lose its tail
export const optimizeRequestSchema = z.object({
  title: z.string().trim().max(200, "Title is too long"),
  content: z
    .string()
    .max(
      OPTIMIZE_INPUT_MAX,
      `Prompts over ${OPTIMIZE_INPUT_MAX.toLocaleString("en")} characters are too long to optimize.`,
    )
    .refine((content) => content.trim().length > 0, "Nothing to optimize."),
});

export type OptimizeRequest = z.infer<typeof optimizeRequestSchema>;
