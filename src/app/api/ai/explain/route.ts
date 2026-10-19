import { aiErrorResponse } from "@/lib/ai/errors";
import { streamExplanation } from "@/lib/ai/explain";
import { guardAiRequest } from "@/lib/ai/guard";
import { explainRequestSchema } from "@/lib/validation/ai";

// POST /api/ai/explain — a Markdown explanation of a code item, streamed as
// plain text. Never writes, and nothing is saved: each click regenerates. A
// Route Handler for the same reason as /api/ai/tags, and because a Server
// Action can't stream. Refusals and failures before the first token are JSON
// in the usual { success, error } shape; the client tells them apart by status.
export async function POST(request: Request) {
  const guarded = await guardAiRequest(request, explainRequestSchema);
  if (guarded.response) return guarded.response;

  try {
    const body = await streamExplanation(
      guarded.data,
      guarded.userId,
      request.signal,
    );
    return new Response(body, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return aiErrorResponse(error, "Couldn't explain this code.");
  }
}
