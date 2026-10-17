import { NextResponse } from "next/server";
import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  RateLimitError,
} from "openai";

export const AI_UNAVAILABLE = "AI features are temporarily unavailable.";
const AI_BUSY = "AI is busy — try again in a moment.";
const AI_TIMEOUT = "AI took too long to respond.";
const AI_FAILED = "Could not generate a suggestion.";

/** The model answered but gave nothing usable: a refusal, or out of tokens. */
export class AiNoResultError extends Error {
  constructor(reason: string) {
    super(`AI returned no usable result: ${reason}`);
    this.name = "AiNoResultError";
  }
}

function failure(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

/**
 * Turn whatever an OpenAI call threw into our own response. OpenAI's message
 * never reaches the client — it can name the org, the model or quota details —
 * and its 429 is never passed on as ours: our 429 means *you* hit *your* limit,
 * theirs is a server-side problem and becomes a 503.
 *
 * `noResult` is the feature's wording for a model that couldn't comply.
 */
export function aiErrorResponse(
  error: unknown,
  noResult: string,
): NextResponse {
  if (error instanceof AiNoResultError) {
    console.info(error.message);
    return failure(422, noResult);
  }

  // Before APIConnectionError, which it extends
  if (error instanceof APIConnectionTimeoutError) {
    console.warn("OpenAI call timed out", error);
    return failure(504, AI_TIMEOUT);
  }
  if (error instanceof APIConnectionError) {
    console.warn("OpenAI unreachable", error);
    return failure(504, AI_TIMEOUT);
  }

  if (error instanceof RateLimitError) {
    // OpenAI puts insufficient_quota in `type` and a detail such as
    // credit_balance_exhausted in `code`; older responses put it in `code`
    if (
      error.type === "insufficient_quota" ||
      error.code === "insufficient_quota"
    ) {
      // The budget cap or billing — the one worth alerting on
      console.error("OpenAI quota exhausted", error);
      return failure(503, AI_UNAVAILABLE);
    }
    console.warn("OpenAI rate limited us", error);
    return failure(503, AI_BUSY);
  }

  if (
    error instanceof APIError &&
    error.status !== undefined &&
    error.status >= 500
  ) {
    console.warn("OpenAI outage", error);
    return failure(503, AI_UNAVAILABLE);
  }

  // A 400 or 401 from OpenAI is our bug or our key; anything else is unknown
  console.error("AI call failed", error);
  return failure(500, AI_FAILED);
}
