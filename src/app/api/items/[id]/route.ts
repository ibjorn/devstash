import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getItemDetail } from "@/lib/db/items";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/items/[id] — full item detail for the drawer.
//
// This route authenticates itself. src/proxy.ts matches the *pages*
// (/dashboard, /items, /profile) and never sees /api/items/..., and putting it
// behind the matcher would be wrong anyway: the proxy answers a signed-out
// request with a 307 to the sign-in page, which a fetch() would follow and then
// fail to parse as JSON. A 401 is the honest answer here.
export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not signed in" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const item = await getItemDetail(session.user.id, id);

  // Someone else's item and a nonexistent one are the same answer — the query
  // is scoped by userId, so this never confirms that an id exists elsewhere
  if (!item) {
    return NextResponse.json(
      { success: false, error: "Item not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ success: true, data: item });
}
