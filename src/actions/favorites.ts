"use server";

import {
  setCollectionFavorite as setCollectionFavoriteQuery,
  setItemFavorite as setItemFavoriteQuery,
} from "@/lib/db/favorites";
import { setFlag, type FlagActionResult } from "@/lib/flag-action";

export type FavoriteActionResult = FlagActionResult;

const SIGNED_OUT = "You need to be signed in to change favorites.";

export async function setItemFavorite(
  id: unknown,
  isFavorite: unknown,
): Promise<FavoriteActionResult> {
  return setFlag({
    id,
    value: isFavorite,
    write: setItemFavoriteQuery,
    noun: "item",
    signedOut: SIGNED_OUT,
  });
}

export async function setCollectionFavorite(
  id: unknown,
  isFavorite: unknown,
): Promise<FavoriteActionResult> {
  return setFlag({
    id,
    value: isFavorite,
    write: setCollectionFavoriteQuery,
    noun: "collection",
    signedOut: SIGNED_OUT,
  });
}
