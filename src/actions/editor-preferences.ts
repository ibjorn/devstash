"use server";

import { getSessionUserId } from "@/lib/db/session-user";
import { updateEditorPreferences as updateEditorPreferencesQuery } from "@/lib/db/users";
import {
  editorPreferencesSchema,
  type EditorPreferences,
} from "@/lib/editor-preferences";

export interface EditorPreferencesActionResult {
  success: boolean;
  data?: EditorPreferences;
  error?: string;
}

/**
 * Saves the full set of editor preferences for the session user. The form
 * auto-saves, so there is no field to hang an error on — failures come back
 * as one toastable message.
 */
export async function updateEditorPreferences(
  input: unknown,
): Promise<EditorPreferencesActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      success: false,
      error: "You need to be signed in to change editor preferences.",
    };
  }

  const parsed = editorPreferencesSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Those editor preferences aren't valid." };
  }

  try {
    const saved = await updateEditorPreferencesQuery(userId, parsed.data);
    return { success: true, data: saved };
  } catch (error) {
    console.error("updateEditorPreferences failed", error);
    return { success: false, error: "Could not save editor preferences." };
  }
}
