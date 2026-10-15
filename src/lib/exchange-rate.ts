import { z } from "zod";

// ECB reference rates: free, keyless, updated on working days. The .dev/v1 URL
// is canonical — frankfurter.app 301-redirects here.
const RATE_URL = "https://api.frankfurter.dev/v1/latest?from=ZAR&to=USD";

// The rate moves once a day, so one upstream call a day is plenty
const REVALIDATE_SECONDS = 86_400;
const TIMEOUT_MS = 3_000;

const rateResponseSchema = z.object({
  rates: z.object({ USD: z.number().positive() }),
});

/**
 * Rand → dollar rate for the approximate USD prices, or null when it can't be
 * had. Fails soft: pricing falls back to rand-only rather than breaking the
 * page over a display nicety.
 */
export async function getZarToUsdRate(): Promise<number | null> {
  try {
    const response = await fetch(RATE_URL, {
      next: { revalidate: REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const parsed = rateResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new Error("unexpected response shape");

    return parsed.data.rates.USD;
  } catch (error) {
    console.warn("ZAR→USD rate unavailable, showing rand only:", error);
    return null;
  }
}

/** Rand converted at `rate`, rounded to the cent. */
export function zarToUsd(zar: number, rate: number): number {
  return Math.round(zar * rate * 100) / 100;
}

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$8.07" */
export function formatUsd(usd: number): string {
  return USD.format(usd);
}
