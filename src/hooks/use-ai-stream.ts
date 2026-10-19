"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useErrorToast } from "@/hooks/use-error-toast";

interface AiFailure {
  error?: string;
  upgrade?: boolean;
}

/**
 * A streamed POST to an /api/ai route that answers with plain text: the text
 * so far, whether it's still arriving, a Stop, and an abort on unmount —
 * closing the drawer stops OpenAI generating. Refusals arrive as JSON before
 * the stream and toast like useAiSuggestion's. A stream that breaks partway
 * means the server gave up (out of tokens, upstream failure), so the partial
 * text is dropped rather than shown as if it were the whole answer.
 */
export function useAiStream<Body>(path: string) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const showError = useErrorToast();

  useEffect(() => () => controllerRef.current?.abort(), []);

  const stop = useCallback(() => controllerRef.current?.abort(), []);

  const start = useCallback(
    async (body: Body) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setText("");
      setStreaming(true);
      let receiving = false;

      try {
        const response = await fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          const result = (await response
            .json()
            .catch(() => null)) as AiFailure | null;
          showError(
            result?.error ?? "Could not generate a response.",
            result?.upgrade,
          );
          return;
        }

        receiving = true;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setText((previous) => previous + chunk);
        }
      } catch {
        // Stop keeps what has arrived; anything else is a broken answer
        if (!controller.signal.aborted) {
          setText("");
          showError(
            receiving
              ? "The response was cut off — try again."
              : "Could not reach the server — try again.",
          );
        }
      } finally {
        if (controllerRef.current === controller) {
          controllerRef.current = null;
          setStreaming(false);
        }
      }
    },
    [path, showError],
  );

  return { text, streaming, start, stop };
}
