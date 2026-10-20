import { UNREACHABLE_MESSAGE } from "@/lib/messages";

export type PostJsonResult<T> =
  { ok: true; data: T | undefined } | { ok: false; error: string };

/**
 * POST a JSON body to one of the app's own `{ success, data, error }` routes,
 * for the fetch-based auth forms. Never throws: a failed response carries the
 * route's error (or `fallbackError` when it gave none), and a request that got
 * no usable answer at all carries UNREACHABLE_MESSAGE.
 */
export async function postJson<T = unknown>(
  url: string,
  body: unknown,
  fallbackError: string,
): Promise<PostJsonResult<T>> {
  let response: Response;
  let result: { data?: T; error?: string } | null;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    result = await response.json();
  } catch {
    return { ok: false, error: UNREACHABLE_MESSAGE };
  }

  if (!response.ok) {
    return { ok: false, error: result?.error ?? fallbackError };
  }
  return { ok: true, data: result?.data };
}
