import { z } from "zod";

// Nothing here is a security boundary on its own — ownership is enforced in the
// query's where clause — but a server action is a public endpoint, so every
// field a caller can send is bounded rather than trusted.
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 1000;
const CONTENT_MAX = 100_000;
const URL_MAX = 2048;
const LANGUAGE_MAX = 50;
const TAG_MAX = 50;
const TAGS_MAX = 20;

// Empty strings coming out of a cleared input mean "no value", not "". Trim
// first so a field holding only whitespace collapses to null too.
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .default(null);

export const updateItemSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(TITLE_MAX, `Title must be at most ${TITLE_MAX} characters`),
  description: optionalText(
    DESCRIPTION_MAX,
    `Description must be at most ${DESCRIPTION_MAX} characters`,
  ),
  content: optionalText(
    CONTENT_MAX,
    `Content must be at most ${CONTENT_MAX.toLocaleString("en")} characters`,
  ),
  language: optionalText(
    LANGUAGE_MAX,
    `Language must be at most ${LANGUAGE_MAX} characters`,
  ),
  // Validated as a URL only when one was actually supplied — an emptied field
  // clears the column rather than failing the form.
  url: z
    .string()
    .trim()
    .max(URL_MAX, `URL must be at most ${URL_MAX} characters`)
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .default(null)
    .refine(
      (value) => value === null || z.url().safeParse(value).success,
      "Enter a valid URL, including http:// or https://",
    ),
  // Normalised before the limits are applied, so "react, React" counts once
  // rather than spending two of the twenty slots.
  tags: z
    .array(z.string())
    .transform(normalizeTags)
    .refine(
      (tags) => tags.length <= TAGS_MAX,
      `An item can have at most ${TAGS_MAX} tags`,
    )
    .refine(
      (tags) => tags.every((tag) => tag.length <= TAG_MAX),
      `Each tag must be at most ${TAG_MAX} characters`,
    )
    .default([]),
});

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

// Every field limit is shared with editing so the two can't drift. Whether a
// URL is *required* depends on the type, which only the server can resolve, so
// that check lives in the action rather than here.
export const createItemSchema = updateItemSchema.extend({
  itemTypeId: z
    .string({ error: "Choose a type" })
    .trim()
    .min(1, "Choose a type"),
  // The R2 object key a File or Image item's upload landed at. Required for
  // those types and refused for every other — both decided in the action,
  // which is the only place that knows the type.
  fileKey: z.string().trim().max(512).nullable().default(null),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

// Only the shape is checked here; whether the file itself is acceptable for
// the type is decided by validateUpload once the type is resolved
export const requestUploadSchema = z.object({
  itemTypeId: z.string().trim().min(1, "Choose a type"),
  fileName: z
    .string()
    .trim()
    .min(1, "Choose a file")
    .max(255, "File name is too long"),
  fileSize: z.number().int().nonnegative(),
  mimeType: z.string().max(100).default(""),
});

export type RequestUploadInput = z.infer<typeof requestUploadSchema>;

/**
 * Trim, drop blanks, and de-duplicate case-insensitively while keeping the
 * casing the user typed. Tags are unique per user in the database, so sending
 * "React" and "react" together would otherwise be two connectOrCreate writes
 * racing for one row.
 */
export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of tags) {
    const tag = raw.trim();
    if (!tag) continue;

    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(tag);
  }

  return result;
}

/** Split the drawer's comma-separated tag input into the array the schema takes. */
export function parseTagInput(value: string): string[] {
  return normalizeTags(value.split(","));
}
