import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getItemFile } from "@/lib/db/items";
import { getObjectStream } from "@/lib/r2";
import { contentDisposition, servingHeadersFor } from "@/lib/uploads";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function notFound() {
  return NextResponse.json(
    { success: false, error: "File not found" },
    { status: 404 },
  );
}

// GET /api/items/[id]/file — stream an item's file from the private bucket.
// `?download=1` forces a download; otherwise raster images render inline (the
// drawer's preview) and everything else still downloads.
//
// Files are never served from R2 directly: the bucket is private, and going
// through here means the same ownership check as every other item read, plus
// response headers we choose rather than whatever was stored with the object.
// Authenticates itself for the reason /api/items/[id] documents.
export async function GET(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { success: false, error: "Not signed in" },
      { status: 401 },
    );
  }

  const { id } = await params;
  const file = await getItemFile(session.user.id, id);
  if (!file) return notFound();

  const wantsDownload = new URL(request.url).searchParams.has("download");
  const { contentType, inline } = servingHeadersFor(
    file.fileName,
    wantsDownload,
  );

  let object;
  try {
    object = await getObjectStream(file.key);
  } catch (error) {
    console.error("R2 read failed for %s", file.key, error);
    return NextResponse.json(
      { success: false, error: "Could not load this file." },
      { status: 502 },
    );
  }
  if (!object) return notFound();

  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Disposition": contentDisposition(file.fileName, inline),
    // Stop the browser second-guessing the type above — an HTML-looking .txt
    // must stay text
    "X-Content-Type-Options": "nosniff",
    // If this response is ever rendered as a document anyway (an SVG or HTML
    // opened directly), it runs in an opaque origin with no script, so it
    // can't act as the signed-in user
    "Content-Security-Policy":
      "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
    // Per-user content behind a session cookie; never in a shared cache
    "Cache-Control": "private, max-age=300",
  });
  if (object.size !== undefined) {
    headers.set("Content-Length", String(object.size));
  }

  return new Response(object.body, { headers });
}
