import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getCreatableItemType } from "@/lib/db/item-types";
import { createUploadUrl } from "@/lib/r2";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";
import {
  buildObjectKey,
  servingHeadersFor,
  uploadKindFor,
  validateUpload,
} from "@/lib/uploads";
import { parseJsonBody } from "@/lib/parse-json-body";
import { requestUploadSchema } from "@/lib/validation/items";

function badRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

// POST /api/items/upload — grant a presigned URL the browser PUTs one file to.
//
// The file never passes through this server: on Vercel a function's request
// body caps at ~4.5 MB, under the 10 MB file limit. This route validates what
// the browser says it is about to send and signs a URL for exactly that; the
// create action then checks what actually landed before an item points at it.
//
// Authenticates itself for the reason /api/items/[id] documents — the proxy
// matcher covers pages, not /api/items/...
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { success: false, error: "Not signed in" },
      { status: 401 },
    );
  }

  const parsed = await parseJsonBody(request, requestUploadSchema, {
    invalid: "Invalid request",
    invalidJson: "Invalid request body",
  });
  if (parsed.response) return parsed.response;
  const { itemTypeId, fileName, fileSize, mimeType } = parsed.data;

  const type = await getCreatableItemType(itemTypeId);
  const kind = type ? uploadKindFor(type.name) : null;
  if (!kind) {
    return badRequest("That item type doesn't take uploads.");
  }

  const invalid = validateUpload(kind, { fileName, fileSize, mimeType });
  if (invalid) return badRequest(invalid);

  // After validation, so a malformed request doesn't spend the user's budget
  const limit = await checkRateLimit("fileUpload", userId);
  if (!limit.success) return tooManyRequests(limit);

  const key = buildObjectKey(userId, fileName);
  // The type is chosen here, not taken from the browser, and signed into the
  // URL — the browser has to send exactly this Content-Type header
  const { contentType } = servingHeadersFor(fileName, true);

  try {
    const uploadUrl = await createUploadUrl(key, contentType, fileSize);
    return NextResponse.json({
      success: true,
      data: { key, uploadUrl, contentType },
    });
  } catch (error) {
    console.error("createUploadUrl failed", error);
    return NextResponse.json(
      { success: false, error: "Uploads are unavailable right now." },
      { status: 500 },
    );
  }
}
