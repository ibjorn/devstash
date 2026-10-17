import { createHash } from "node:crypto";

import type { ResponseUsage } from "openai/resources/responses/responses";

/**
 * What OpenAI's `safety_identifier` gets: lets it attribute abuse to one end
 * user instead of flagging the whole org. A hash, never the raw cuid or email.
 */
export function safetyIdentifier(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 64);
}

/** One JSON line per call, so Vercel logs can sum tokens by feature. */
export function logAiUsage(
  feature: string,
  userId: string,
  usage: ResponseUsage | undefined,
): void {
  console.info(
    JSON.stringify({
      event: "ai_usage",
      feature,
      userId,
      inputTokens: usage?.input_tokens ?? 0,
      cachedTokens: usage?.input_tokens_details?.cached_tokens ?? 0,
      outputTokens: usage?.output_tokens ?? 0,
      reasoningTokens: usage?.output_tokens_details?.reasoning_tokens ?? 0,
    }),
  );
}
