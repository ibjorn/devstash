"use server";

import { ZodError } from "zod";

import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import { getItemDetail, updateItem as updateItemQuery } from "@/lib/db/items";
import { updateItemSchema } from "@/lib/validation/items";
import type { ItemDetail } from "@/types/items";

/**
 * Actions return `{ success, data, error, fieldErrors }` per the project's
 * error handling standard. `fieldErrors` is keyed by input name so the drawer
 * can put a message beside the field that caused it; `error` covers anything
 * with no field to blame and is toasted instead.
 */
export interface ItemActionResult {
  success: boolean;
  data?: ItemDetail;
  error?: string;
  fieldErrors?: Record<string, string>;
}

// First message per field wins — later issues on the same input would only push
// the first one out of view
function toFieldErrors(error: ZodError): ItemActionResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field) fieldErrors[field] ??= issue.message;
  }
  return { success: false, fieldErrors };
}

/**
 * The columns an item's content type actually gives meaning to. The drawer
 * already renders conditionally, so these only fire on a hand-made request —
 * but a server action is a public endpoint and the UI is not a control.
 *
 * Keyed on `contentType` rather than the type's name, because a custom type is
 * still one of these three and hardcoding "Snippet"/"Link" here would start
 * rejecting perfectly valid custom-type edits the day those ship.
 */
const ALLOWED_FIELDS = {
  TEXT: { content: true, language: true, url: false },
  URL: { content: false, language: false, url: true },
  FILE: { content: false, language: false, url: false },
} as const;

export async function updateItem(
  itemId: string,
  input: unknown,
): Promise<ItemActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, error: "You need to be signed in to edit items." };
  }

  const parsed = updateItemSchema.safeParse(input);
  if (!parsed.success) {
    return toFieldErrors(parsed.error);
  }

  const data = parsed.data;

  try {
    // Read first only to learn what kind of item this is. Ownership is not
    // established here — the update's own where clause does that atomically —
    // but a caller who owns nothing gets the same "not found" either way.
    const existing = await getItemDetail(userId, itemId);
    if (!existing) {
      return { success: false, error: "That item no longer exists." };
    }

    const allowed = ALLOWED_FIELDS[existing.contentType];
    if (!allowed.content && data.content !== null) {
      return { success: false, error: "This item type has no content field." };
    }
    if (!allowed.language && data.language !== null) {
      return { success: false, error: "This item type has no language field." };
    }
    if (!allowed.url && data.url !== null) {
      return { success: false, error: "This item type has no URL field." };
    }

    const updated = await updateItemQuery(userId, itemId, {
      title: data.title,
      description: data.description,
      // Leave the columns this type doesn't use exactly as they were rather
      // than writing nulls over them.
      content: allowed.content ? data.content : existing.content,
      language: allowed.language ? data.language : existing.language,
      url: allowed.url ? data.url : existing.url,
      tags: data.tags,
    });

    return { success: true, data: updated };
  } catch (error) {
    // The row vanished between the read and the write, or was never the
    // caller's to begin with.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, error: "That item no longer exists." };
    }

    console.error("updateItem failed", error);
    return { success: false, error: "Could not save your changes." };
  }
}
