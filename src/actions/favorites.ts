"use server";

import {
  setCollectionFavorite as setCollectionFavoriteQuery,
  setItemFavorite as setItemFavoriteQuery,
} from "@/lib/db/favorites";
import { getSessionUserId } from "@/lib/db/session-user";

/**
 * `{ success, error }` per the project's error handling standard; the caller
 * already knows the value it asked for, so there is no `data`.
 *
 * Both actions take the desired value rather than flipping the stored one: a
 * flip sent from a stale card (another tab, a double click) would do the
 * opposite of what the user meant, while setting a value is idempotent.
 */
export interface FavoriteActionResult {
  success: boolean;
  error?: string;
}

const SIGNED_OUT = "You need to be signed in to change favorites.";

function isId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}

async function setFavorite(
  id: unknown,
  isFavorite: unknown,
  write: (userId: string, id: string, value: boolean) => Promise<boolean>,
  noun: "item" | "collection",
): Promise<FavoriteActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: SIGNED_OUT };

  const gone = `That ${noun} no longer exists.`;
  if (!isId(id)) return { success: false, error: gone };
  if (typeof isFavorite !== "boolean") {
    return { success: false, error: `Could not update this ${noun}.` };
  }

  try {
    const updated = await write(userId, id, isFavorite);
    return updated ? { success: true } : { success: false, error: gone };
  } catch (error) {
    console.error(`set ${noun} favorite failed`, error);
    return { success: false, error: `Could not update this ${noun}.` };
  }
}

export async function setItemFavorite(
  id: unknown,
  isFavorite: unknown,
): Promise<FavoriteActionResult> {
  return setFavorite(id, isFavorite, setItemFavoriteQuery, "item");
}

export async function setCollectionFavorite(
  id: unknown,
  isFavorite: unknown,
): Promise<FavoriteActionResult> {
  return setFavorite(id, isFavorite, setCollectionFavoriteQuery, "collection");
}
