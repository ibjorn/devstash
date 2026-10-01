import { getSessionUserId } from "@/lib/db/session-user";

/**
 * `{ success, error }` per the project's error handling standard; the caller
 * already knows the value it asked for, so there is no `data`.
 */
export interface FlagActionResult {
  success: boolean;
  error?: string;
}

interface SetFlagOptions {
  id: unknown;
  value: unknown;
  /** False when no row of the user's matched. */
  write: (userId: string, id: string, value: boolean) => Promise<boolean>;
  noun: "item" | "collection";
  signedOut: string;
}

function isId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 64;
}

/**
 * The body shared by the server actions that set a boolean flag on one of the
 * user's rows (favorite, pinned). They take the desired value rather than
 * flipping the stored one: a flip sent from a stale card (another tab, a double
 * click) would do the opposite of what the user meant, while setting a value is
 * idempotent.
 */
export async function setFlag({
  id,
  value,
  write,
  noun,
  signedOut,
}: SetFlagOptions): Promise<FlagActionResult> {
  const userId = await getSessionUserId();
  if (!userId) return { success: false, error: signedOut };

  const gone = `That ${noun} no longer exists.`;
  const failed = `Could not update this ${noun}.`;
  if (!isId(id)) return { success: false, error: gone };
  if (typeof value !== "boolean") return { success: false, error: failed };

  try {
    const updated = await write(userId, id, value);
    return updated ? { success: true } : { success: false, error: gone };
  } catch (error) {
    console.error(`set ${noun} flag failed`, error);
    return { success: false, error: failed };
  }
}
