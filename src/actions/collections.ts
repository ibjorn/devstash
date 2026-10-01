"use server";

import { createCollection as createCollectionQuery } from "@/lib/db/collections";
import { getSessionUserId } from "@/lib/db/session-user";
import { createCollectionSchema } from "@/lib/validation/collections";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import type { CollectionSummary } from "@/types/collections";

/**
 * `{ success, data, error, fieldErrors }` per the project's error handling
 * standard: `fieldErrors` sits beside its input, `error` is toasted.
 */
export interface CollectionActionResult {
  success: boolean;
  data?: CollectionSummary;
  error?: string;
  fieldErrors?: Record<string, string>;
}

export async function createCollection(
  input: unknown,
): Promise<CollectionActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      success: false,
      error: "You need to be signed in to create collections.",
    };
  }

  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    const created = await createCollectionQuery(userId, parsed.data);
    return { success: true, data: created };
  } catch (error) {
    console.error("createCollection failed", error);
    return { success: false, error: "Could not create this collection." };
  }
}
