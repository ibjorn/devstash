"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useErrorToast } from "@/hooks/use-error-toast";

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
  const controllerRef = useRef<AbortController | null>(null);
  const showError = useErrorToast(onUpgrade);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const request = useCallback(
    async (body: Body): Promise<Data | null> => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setPending(true);

      try {
        const response = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
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
        if (!controller.signal.aborted) {
          showError("Could not reach the server — try again.");
        }
        return null;
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setPending(false);
        }
      }
    },
    [path, showError],
  );

  return { request, pending };
}
