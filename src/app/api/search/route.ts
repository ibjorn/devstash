import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getSearchableCollections } from "@/lib/db/collections";
import { getSearchableItems } from "@/lib/db/items";
import type { SearchData } from "@/types/search";

// GET /api/search — everything the command palette searches, fetched when the
// palette opens. Searching itself happens in the browser.
//
// Authenticates itself for the same reason as /api/items/[id]: the proxy
// matcher covers pages, not /api, and its 307 to the sign-in page is the wrong
// answer to a fetch() anyway.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not signed in" },
      { status: 401 },
    );
  }

  const [items, collections] = await Promise.all([
    getSearchableItems(session.user.id),
    getSearchableCollections(session.user.id),
  ]);
  const data: SearchData = { items, collections };

  return NextResponse.json({ success: true, data });
}
