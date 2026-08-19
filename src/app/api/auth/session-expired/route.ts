import { NextResponse } from "next/server";

import { auth, signOut } from "@/auth";
import { getCurrentUser } from "@/lib/db/users";

// Landing spot for a JWT that survived its User row (deleted account, wiped
// database). The cookie has to be cleared somewhere that can write cookies,
// which a server component can't do — hence a route handler.
export async function GET(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Only tear down a session that is genuinely orphaned. A GET carries no CSRF
  // protection, so without this check any other site could force-sign-out a
  // visitor with a bare <img src="…/session-expired">.
  const user = await getCurrentUser(userId);
  if (user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  await signOut({ redirect: false });

  return NextResponse.redirect(
    new URL("/sign-in?error=SessionExpired", request.url)
  );
}
