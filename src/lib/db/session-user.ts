import { cache } from "react";

import { auth } from "@/auth";

// Resolves the signed-in user's id for data queries. Callers live behind the
// proxy matcher (/dashboard/:path*), so a missing session means the route is
// unprotected — a bug worth surfacing rather than silently rendering nothing.
//
// Cached per request so a render tree that needs the id in several places
// only decodes the session cookie once.
export const requireUserId = cache(async (): Promise<string> => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("requireUserId called without an authenticated session");
  }

  return session.user.id;
});
