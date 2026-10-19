import { NextResponse } from "next/server";

import { aiErrorResponse } from "@/lib/ai/errors";
import { guardAiRequest } from "@/lib/ai/guard";
import { optimizePrompt } from "@/lib/ai/optimize";
import { optimizeRequestSchema } from "@/lib/validation/ai";

// POST /api/ai/optimize — a refined version of a saved prompt, with what
// changed. Never writes: the drawer asks first and saves an accepted rewrite
// through updateItem. A Route Handler for the same reason as /api/ai/tags.
export async function POST(request: Request) {
  const guarded = await guardAiRequest(request, optimizeRequestSchema);
  if (guarded.response) return guarded.response;

  try {
    const data = await optimizePrompt(guarded.data, guarded.userId);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return aiErrorResponse(error, "Couldn't optimize this prompt.");
  }
}
