"use client";

import { useCallback, useState } from "react";

import { useAbortablePost } from "@/hooks/use-abortable-post";
import { useErrorToast } from "@/hooks/use-error-toast";
import { UNREACHABLE_MESSAGE } from "@/lib/messages";
import { readTextStream } from "@/lib/read-text-stream";

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
export function useAiStream<Body>(path: string, onUpgrade?: () => void) {
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const { begin, abort } = useAbortablePost();
  const showError = useErrorToast(onUpgrade);

  const start = useCallback(
    async (body: Body) => {
      const inFlight = begin();
      setText("");
      setStreaming(true);
      let receiving = false;

      try {
        const response = await inFlight.post(path, body);
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
        await readTextStream(response.body, (chunk) =>
          setText((previous) => previous + chunk),
        );
      } catch {
        // Stop keeps what has arrived; anything else is a broken answer
        if (!inFlight.signal.aborted) {
          setText("");
          showError(
            receiving
              ? "The response was cut off — try again."
              : UNREACHABLE_MESSAGE,
          );
        }
      } finally {
        if (inFlight.isCurrent()) setStreaming(false);
      }
    },
    [begin, path, showError],
  );

  return { text, streaming, start, stop: abort };
}
