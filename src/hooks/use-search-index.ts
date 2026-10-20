"use client";

import { useCallback, useRef, useState } from "react";

import type { SearchData, SearchDataResponse } from "@/types/search";

// Dates don't survive JSON; the API sends createdAt as an ISO string
function toSearchData(body: SearchDataResponse): SearchData {
  return {
    items: body.items.map((item) => ({
      ...item,
      createdAt: new Date(item.createdAt),
    })),
    collections: body.collections,
  };
}

/**
 * The search palette's index, fetched on demand rather than with the page so
 * it never rides along in every render. Each `load` refetches behind the copy
 * already held, and only the latest request's answer is kept.
 */
export function useSearchIndex() {
  const [data, setData] = useState<SearchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const request = ++latestRequest.current;
    setError(null);

    try {
      const response = await fetch("/api/search");
      const body = await response.json();
      if (request !== latestRequest.current) return;

      if (!response.ok || !body?.success) {
        setError(body?.error ?? "Could not load search.");
        return;
      }

      setData(toSearchData(body.data as SearchDataResponse));
    } catch {
      if (request === latestRequest.current) {
        setError("Could not load search.");
      }
    }
  }, []);

  return { data, error, load };
}
