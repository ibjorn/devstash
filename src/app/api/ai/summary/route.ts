import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/lib/ai/errors";
import { guardAiRequest } from "@/lib/ai/guard";
import { suggestSummary } from "@/lib/ai/summary";
import { summaryRequestSchema } from "@/lib/validation/ai";

// POST /api/ai/summary — a short description for the item form's current draft.
// Never writes: the summary goes into the Description field and Save persists
// it. A Route Handler for the same reason as /api/ai/tags.
export async function POST(request: Request) {
  const guarded = await guardAiRequest(request, summaryRequestSchema);
  if (guarded.response) return guarded.response;

  try {
    const summary = await suggestSummary(guarded.data, guarded.userId);
    return NextResponse.json({ success: true, data: { summary } });
  } catch (error) {
    return aiErrorResponse(error, "Couldn't summarise this item.");
  }
}
