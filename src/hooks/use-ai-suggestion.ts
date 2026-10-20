"use client";

import { useCallback, useState } from "react";

import { useAbortablePost } from "@/hooks/use-abortable-post";
import { useErrorToast } from "@/hooks/use-error-toast";
import { UNREACHABLE_MESSAGE } from "@/lib/messages";

interface AiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  upgrade?: boolean;
}

/**
 * One non-streamed POST to an /api/ai route: the in-flight flag, the error
 * toast (with Upgrade when the plan refused it), and an abort when the form
 * unmounts — closing the dialog shouldn't leave a toast arriving afterwards.
 *
 * `request` resolves to the route's `data`, or null once it has reported a
 * failure (or been aborted, which reports nothing).
 */
export function useAiSuggestion<Body, Data>(
  path: string,
  onUpgrade?: () => void,
) {
  const [pending, setPending] = useState(false);
  const { begin } = useAbortablePost();
  const showError = useErrorToast(onUpgrade);

  const request = useCallback(
    async (body: Body): Promise<Data | null> => {
      const inFlight = begin();
      setPending(true);

      try {
        const response = await inFlight.post(path, body);
        const result = (await response
          .json()
          .catch(() => null)) as AiResult<Data> | null;
        if (!response.ok || !result?.success || !result.data) {
          showError(
            result?.error ?? "Could not generate a suggestion.",
            result?.upgrade,
          );
          return null;
        }
        return result.data;
      } catch {
        if (!inFlight.signal.aborted) showError(UNREACHABLE_MESSAGE);
        return null;
      } finally {
        if (inFlight.isCurrent()) setPending(false);
      }
    },
    [begin, path, showError],
  );

  return { request, pending };
}
