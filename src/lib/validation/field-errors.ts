import type { ZodError } from "zod";

/**
 * Maps a Zod error to `{ fieldName: message }`, keyed by the top-level path
 * segment so each message can sit next to the input that caused it. The first
 * message per field wins, since later issues on the same input would only push
 * it out of view. Issues with no path (whole-object refines) are dropped here;
 * callers that need them read `error.issues` directly.
 */
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "");
    if (field) fieldErrors[field] ??= issue.message;
  }
  return fieldErrors;
}
