"use server";

import { ZodError } from "zod";

import { auth } from "@/auth";
import { Prisma } from "@/generated/prisma/client";
import {
  createItem as createItemQuery,
  deleteItem as deleteItemQuery,
  getCreatableItemType,
  getItemDetail,
  isFileKeyInUse,
  updateItem as updateItemQuery,
} from "@/lib/db/items";
import { deleteObject, getObjectSize } from "@/lib/r2";
import {
  fileNameFromKey,
  type UploadKind,
  uploadKindFor,
  validateUpload,
} from "@/lib/uploads";
import {
  createItemSchema,
  type UpdateItemInput,
  updateItemSchema,
} from "@/lib/validation/items";
import type { CreatableItemType, ItemDetail } from "@/types/items";

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

type AllowedFields = (typeof ALLOWED_FIELDS)[keyof typeof ALLOWED_FIELDS];

// The first column a type has no use for but the caller filled in anyway
function unusedFieldError(
  allowed: AllowedFields,
  data: Pick<UpdateItemInput, "content" | "language" | "url">,
): string | null {
  if (!allowed.content && data.content !== null) {
    return "This item type has no content field.";
  }
  if (!allowed.language && data.language !== null) {
    return "This item type has no language field.";
  }
  if (!allowed.url && data.url !== null) {
    return "This item type has no URL field.";
  }
  return null;
}

interface ResolvedFile {
  fileUrl: string;
  fileName: string;
  fileSize: number;
}

const UPLOAD_NOT_FOUND =
  "That upload could not be found — please upload the file again.";

// Best effort: the item's outcome is already decided by the time this runs, so
// a failure here is logged rather than reported — it leaves an orphan object,
// not a broken item
async function removeObject(key: string) {
  try {
    await deleteObject(key);
  } catch (error) {
    console.error("R2 delete failed for %s", key, error);
  }
}

/**
 * Check what the browser uploaded before an item points at it. The key is only
 * accepted in the exact shape the upload route builds under this user's
 * prefix, and the object's real size — not anything the client reported — is
 * checked against the type's limit. An object that fails is deleted.
 */
async function resolveUploadedFile(
  userId: string,
  kind: UploadKind,
  key: string,
): Promise<ResolvedFile | string> {
  const fileName = fileNameFromKey(userId, key);
  if (!fileName) return UPLOAD_NOT_FOUND;
  if (await isFileKeyInUse(userId, key)) return UPLOAD_NOT_FOUND;

  const fileSize = await getObjectSize(key);
  if (fileSize === null) return UPLOAD_NOT_FOUND;

  const invalid = validateUpload(kind, { fileName, fileSize });
  if (invalid) {
    await removeObject(key);
    return invalid;
  }

  return { fileUrl: key, fileName, fileSize };
}

// The file columns for a new item: resolved from the upload for File and
// Image, refused for every other type
async function fileFieldsFor(
  userId: string,
  type: CreatableItemType,
  fileKey: string | null,
): Promise<ResolvedFile | null | ItemActionResult> {
  const kind = uploadKindFor(type.name);
  if (type.contentType !== "FILE" || !kind) {
    if (fileKey !== null) {
      return { success: false, error: "This item type has no file field." };
    }
    if (type.contentType === "FILE") {
      return { success: false, error: "That item type isn't available." };
    }
    return null;
  }

  if (fileKey === null) {
    return { success: false, fieldErrors: { file: "Upload a file first" } };
  }

  const resolved = await resolveUploadedFile(userId, kind, fileKey);
  if (typeof resolved === "string") {
    return { success: false, fieldErrors: { file: resolved } };
  }
  return resolved;
}

function isActionResult(value: unknown): value is ItemActionResult {
  return typeof value === "object" && value !== null && "success" in value;
}

export async function createItem(input: unknown): Promise<ItemActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      success: false,
      error: "You need to be signed in to create items.",
    };
  }

  const parsed = createItemSchema.safeParse(input);
  if (!parsed.success) {
    return toFieldErrors(parsed.error);
  }

  const data = parsed.data;

  try {
    // The client names the type; the server decides what it is and whether it
    // may be used. contentType comes from here, never from the request.
    const type = await getCreatableItemType(data.itemTypeId);
    if (!type) {
      return { success: false, error: "That item type isn't available." };
    }

    const allowed = ALLOWED_FIELDS[type.contentType];
    const unused = unusedFieldError(allowed, data);
    if (unused) {
      return { success: false, error: unused };
    }
    if (type.contentType === "URL" && data.url === null) {
      return { success: false, fieldErrors: { url: "URL is required" } };
    }

    const file = await fileFieldsFor(userId, type, data.fileKey);
    if (isActionResult(file)) return file;

    const created = await createItemQuery(userId, {
      itemTypeId: type.id,
      contentType: type.contentType,
      title: data.title,
      description: data.description,
      content: data.content,
      language: data.language,
      url: data.url,
      tags: data.tags,
      fileUrl: file?.fileUrl ?? null,
      fileName: file?.fileName ?? null,
      fileSize: file?.fileSize ?? null,
    });

    return { success: true, data: created };
  } catch (error) {
    console.error("createItem failed", error);
    return { success: false, error: "Could not create this item." };
  }
}

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
    const unused = unusedFieldError(allowed, data);
    if (unused) {
      return { success: false, error: unused };
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

export async function deleteItem(itemId: string): Promise<ItemActionResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      success: false,
      error: "You need to be signed in to delete items.",
    };
  }

  if (typeof itemId !== "string" || itemId.length === 0) {
    return { success: false, error: "That item no longer exists." };
  }

  let fileKey: string | null;
  try {
    ({ fileKey } = await deleteItemQuery(userId, itemId));
  } catch (error) {
    // Already deleted — perhaps in another tab — or never the caller's.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return { success: false, error: "That item no longer exists." };
    }

    console.error("deleteItem failed", error);
    return { success: false, error: "Could not delete this item." };
  }

  // Only once the row is gone: deleting the object first would leave an item
  // pointing at nothing if the database delete then failed
  if (fileKey) await removeObject(fileKey);
  return { success: true };
}
