"use server";

import {
  createCollection as createCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  updateCollection as updateCollectionQuery,
} from "@/lib/db/collections";
import { getSessionUserId } from "@/lib/db/session-user";
import { isPrismaError } from "@/lib/prisma-errors";
import {
  createCollectionSchema,
  updateCollectionSchema,
} from "@/lib/validation/collections";
import { fieldErrorsFrom } from "@/lib/validation/field-errors";
import type { CollectionHeader, CollectionSummary } from "@/types/collections";

/**
 * `{ success, data, error, fieldErrors }` per the project's error handling
 * standard: `fieldErrors` sits beside its input, `error` is toasted.
 */
export interface CollectionActionResult<T = CollectionSummary> {
  success: boolean;
  data?: T;
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

const GONE = "That collection no longer exists.";

function isCollectionId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}

export async function updateCollection(
  id: unknown,
  input: unknown,
): Promise<CollectionActionResult<CollectionHeader>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      success: false,
      error: "You need to be signed in to edit collections.",
    };
  }

  if (!isCollectionId(id)) return { success: false, error: GONE };

  const parsed = updateCollectionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    const updated = await updateCollectionQuery(userId, id, parsed.data);
    return { success: true, data: updated };
  } catch (error) {
    // Deleted in another tab, or never the caller's
    if (isPrismaError(error, "P2025")) return { success: false, error: GONE };

    console.error("updateCollection failed", error);
    return { success: false, error: "Could not save this collection." };
  }
}

/** Deletes the collection only; its items stay, just no longer in it. */
export async function deleteCollection(
  id: unknown,
): Promise<CollectionActionResult<never>> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      success: false,
      error: "You need to be signed in to delete collections.",
    };
  }

  if (!isCollectionId(id)) return { success: false, error: GONE };

  try {
    await deleteCollectionQuery(userId, id);
    return { success: true };
  } catch (error) {
    if (isPrismaError(error, "P2025")) return { success: false, error: GONE };

    console.error("deleteCollection failed", error);
    return { success: false, error: "Could not delete this collection." };
  }
}
