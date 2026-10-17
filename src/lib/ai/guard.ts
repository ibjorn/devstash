import { NextResponse } from "next/server";
import type { z } from "zod";

import { auth } from "@/auth";
import { getPlanUsage } from "@/lib/db/entitlements";
import { checkProFeature, DENIAL_MESSAGES } from "@/lib/entitlements";
import { parseJsonBody } from "@/lib/parse-json-body";
import { checkRateLimit, tooManyRequests } from "@/lib/rate-limit";

import { AI_UNAVAILABLE } from "./errors";

export type Guarded<T> =
  | { userId: string; data: T; response?: never }
  | { userId?: never; data?: never; response: NextResponse };

/**
 * Everything an AI route checks before it spends money, in the upload route's
 * order: session, body, Pro, rate limit. Cheap refusals come first so a
 * malformed or Free request doesn't spend the user's budget. On refusal
 * `response` is the error to return as-is, in the `{ success, error }` shape.
 *
 * Each route calls this itself — the proxy matcher covers pages, not /api.
 */
export async function guardAiRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<Guarded<T>> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return {
      response: NextResponse.json(
        { success: false, error: "Not signed in" },
        { status: 401 },
      ),
    };
  }

  const parsed = await parseJsonBody(request, schema, {
    invalid: "Invalid request",
    invalidJson: "Invalid request body",
  });
  if (parsed.response) return { response: parsed.response };

  // Null is a stale session; refusing it as Free is the safe reading
  const plan = await getPlanUsage(userId);
  if (!plan || !checkProFeature(plan)) {
    return {
      response: NextResponse.json(
        { success: false, error: DENIAL_MESSAGES.PRO_AI, upgrade: true },
        { status: 403 },
      ),
    };
  }

  // Fails closed: this is the only per-user ceiling on OpenAI spend
  const limit = await checkRateLimit("ai", userId, { failClosed: true });
  if (limit.unavailable) {
    return {
      response: NextResponse.json(
        { success: false, error: AI_UNAVAILABLE },
        { status: 503 },
      ),
    };
  }
  if (!limit.success) return { response: tooManyRequests(limit) };

  return { userId, data: parsed.data };
}
