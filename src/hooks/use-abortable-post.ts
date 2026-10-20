"use client";

import { useCallback, useEffect, useRef } from "react";

export interface AbortableRequest {
  signal: AbortSignal;
  /** POSTs `body` as JSON under this request's signal. */
  post: (path: string, body: unknown) => Promise<Response>;
  /**
   * False once a newer request has replaced this one, so a superseded
   * request finishing late can't clear the newer one's pending flag.
   */
  isCurrent: () => boolean;
}

/**
 * One JSON POST at a time, shared by the AI hooks: `begin()` aborts whatever
 * is still in flight and hands back the new request, and unmounting aborts
 * too — closing a dialog or the drawer shouldn't leave a toast arriving
 * afterwards, or OpenAI still generating. `abort()` is a Stop.
 */
export function useAbortablePost() {
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const abort = useCallback(() => controllerRef.current?.abort(), []);

  const begin = useCallback((): AbortableRequest => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    return {
      signal: controller.signal,
      post: (path, body) =>
        fetch(path, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        }),
      isCurrent: () => controllerRef.current === controller,
    };
  }, []);

  return { begin, abort };
}
