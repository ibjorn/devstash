"use client";

import { useEffect, useEffectEvent } from "react";

import { stripSearchParam } from "@/lib/url-params";

/**
 * Surfaces a one-shot hand-off another route left in the query string —
 * ?error=, ?reset=1, ?billing=success — then strips `param` so a refresh
 * doesn't replay it. `show` should toast with a fixed id, which collapses the
 * duplicate Strict Mode's double-mount would otherwise produce.
 */
export function useHandoffToast(
  value: string | undefined,
  param: string | undefined,
  show: (value: string) => void,
) {
  const onHandoff = useEffectEvent(show);

  useEffect(() => {
    if (!value) return;
    onHandoff(value);
    if (param) stripSearchParam(param);
  }, [value, param]);
}
