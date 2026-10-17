import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/lib/ai/errors";
import { guardAiRequest } from "@/lib/ai/guard";
import { suggestTags } from "@/lib/ai/tags";
import { tagRequestSchema } from "@/lib/validation/ai";

// POST /api/ai/tags — suggest tags for the item form's current draft.
//
// A Route Handler rather than a Server Action: Next.js runs a client's actions
// one at a time, so Save, ⭐ and 📌 would queue behind a multi-second AI call.
// It never writes — accepted tags go into the form, and Save persists them
// through the existing validated action.
export async function POST(request: Request) {
  const guarded = await guardAiRequest(request, tagRequestSchema);
  if (guarded.response) return guarded.response;

  try {
    const tags = await suggestTags(guarded.data, guarded.userId);
    return NextResponse.json({ success: true, data: { tags } });
  } catch (error) {
    return aiErrorResponse(error, "Couldn't suggest anything for this item.");
  }
}
