import "server-only";

import OpenAI from "openai";

// The OpenAI constructor throws when OPENAI_API_KEY is unset, so it's built on
// first use rather than at import, as src/lib/email/resend.ts does — a build or
// a test run without the key shouldn't fail just because this module got
// pulled in. server-only makes a client component importing it fail the build
// instead of shipping the key's module to the browser.
let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    client = new OpenAI({
      apiKey,
      // The SDK default is 10 minutes. Nothing here should take more than a
      // few seconds, and a hung call holds a Vercel function open
      timeout: 30_000,
      // Default 2. One retry covers a transient 5xx/429 without doubling a
      // slow failure
      maxRetries: 1,
    });
  }
  return client;
}

/** The model every AI feature calls — see docs/ai-integration-plan.md §1. */
export function aiModel(): string {
  return process.env.OPENAI_MODEL || "gpt-6-luna";
}
