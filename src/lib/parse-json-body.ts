import { NextResponse } from "next/server";
import type { z } from "zod";

interface BodyMessages {
  /** Shown when the body parses but fails the schema with no issue message. */
  invalid: string;
  /** Shown when the body isn't JSON at all. */
  invalidJson?: string;
}

export type ParsedBody<T> =
  { data: T; response?: never } | { data?: never; response: NextResponse };

function badRequest(error: string) {
  return NextResponse.json({ success: false, error }, { status: 400 });
}

/**
 * Read a route's JSON body and validate it. On failure `response` is the 400 to
 * return as-is, in the `{ success, error }` shape, carrying the schema's first
 * issue so a form can show the message that matters most.
 */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
  messages: BodyMessages,
): Promise<ParsedBody<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      response: badRequest(
        messages.invalidJson ?? "Request body must be valid JSON",
      ),
    };
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      response: badRequest(parsed.error.issues[0]?.message ?? messages.invalid),
    };
  }

  return { data: parsed.data };
}
