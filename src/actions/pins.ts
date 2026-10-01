"use server";

import { setItemPinned as setItemPinnedQuery } from "@/lib/db/pins";
import { setFlag, type FlagActionResult } from "@/lib/flag-action";

export async function setItemPinned(
  id: unknown,
  isPinned: unknown,
): Promise<FlagActionResult> {
  return setFlag({
    id,
    value: isPinned,
    write: setItemPinnedQuery,
    noun: "item",
    signedOut: "You need to be signed in to pin items.",
  });
}
