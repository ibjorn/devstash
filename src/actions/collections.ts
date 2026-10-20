"use server";

import {
  createCollection as createCollectionQuery,
  deleteCollection as deleteCollectionQuery,
  updateCollection as updateCollectionQuery,
} from "@/lib/db/collections";
import { getSessionUserId } from "@/lib/db/session-user";
import { checkCollectionCreate } from "@/lib/entitlements";
import { planDenial } from "@/lib/plan-gate";
import { isPrismaError } from "@/lib/prisma-errors";
import {
  createCollectionSchema,
  updateCollectionSchema,
} from "@/lib/validation/collections";
import { fieldErrorResult } from "@/lib/validation/field-errors";
import { isRowId } from "@/lib/validation/ids";
import type { ActionResult } from "@/types/actions";
import type { CollectionHeader, CollectionSummary } from "@/types/collections";

export type CollectionActionResult<T = CollectionSummary> = ActionResult<T>;

const SIGNED_OUT_CREATE = "You need to be signed in to create collections.";

export async function createCollection(
  input: unknown,
): Promise<CollectionActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: SIGNED_OUT_CREATE };

  const parsed = createCollectionSchema.safeParse(input);
  if (!parsed.success) return fieldErrorResult(parsed.error);

  try {
    const denied = await planDenial(
      userId,
      checkCollectionCreate,
      SIGNED_OUT_CREATE,
    );
    if (denied) return denied;

    const created = await createCollectionQuery(userId, parsed.data);
    return { success: true, data: created };
  } catch (error) {
    console.error("createCollection failed", error);
    return { success: false, error: "Could not create this collection." };
  }
}

const GONE = "That collection no longer exists.";

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

  if (!isRowId(id)) return { success: false, error: GONE };

  const parsed = updateCollectionSchema.safeParse(input);
  if (!parsed.success) return fieldErrorResult(parsed.error);

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

  if (!isRowId(id)) return { success: false, error: GONE };

  try {
    await deleteCollectionQuery(userId, id);
    return { success: true };
  } catch (error) {
    if (isPrismaError(error, "P2025")) return { success: false, error: GONE };

    console.error("deleteCollection failed", error);
    return { success: false, error: "Could not delete this collection." };
  }
}
