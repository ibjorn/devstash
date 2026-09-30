import { cache } from "react";

import { auth } from "@/auth";

// The signed-in user's id, or null without a session. For server actions: an
// action is a public endpoint reachable without a session, so it answers with
// a clean result instead of throwing.
export async function getSessionUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// Resolves the signed-in user's id for data queries. Callers live behind the
// proxy matcher (/dashboard, /items, /profile), so a missing session means the
// route is unprotected — a bug worth surfacing rather than silently rendering
// nothing.
//
// Cached per request so a render tree that needs the id in several places
// only decodes the session cookie once.
export const requireUserId = cache(async (): Promise<string> => {
  const userId = await getSessionUserId();
  if (!userId) {
    throw new Error("requireUserId called without an authenticated session");
  }

  return userId;
});
