import { z } from "zod";

// A server action is a public endpoint, so every field a caller can send is
// bounded rather than trusted. Ownership comes from the session, not from here.
const NAME_MAX = 100;
const DESCRIPTION_MAX = 1000;

export const createCollectionSchema = z.object({
  name: z
    .string("Name is required")
    .trim()
    .min(1, "Name is required")
    .max(NAME_MAX, `Name must be at most ${NAME_MAX} characters`),
  // An emptied field means "no description", not ""
  description: z
    .string()
    .trim()
    .max(
      DESCRIPTION_MAX,
      `Description must be at most ${DESCRIPTION_MAX} characters`,
    )
    .transform((value) => (value.length > 0 ? value : null))
    .nullable()
    .default(null),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;
