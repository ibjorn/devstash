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
