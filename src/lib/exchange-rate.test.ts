import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { formatUsd, getZarToUsdRate, zarToUsd } from "@/lib/exchange-rate";

const fetchMock = vi.fn();

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("getZarToUsdRate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the USD rate, cached for a day", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ base: "ZAR", rates: { USD: 0.0598 } }),
    );

    await expect(getZarToUsdRate()).resolves.toBe(0.0598);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.frankfurter.dev/v1/latest?from=ZAR&to=USD",
      expect.objectContaining({ next: { revalidate: 86_400 } }),
    );
  });

  it("returns null on a non-200", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ message: "down" }, 503));

    await expect(getZarToUsdRate()).resolves.toBeNull();
  });

  it("returns null when the response isn't the expected shape", async () => {
    for (const body of [
      { rates: {} },
      { rates: { USD: "0.06" } },
      { rates: { USD: 0 } },
      { rates: { USD: -1 } },
    ]) {
      fetchMock.mockResolvedValue(jsonResponse(body));
      await expect(getZarToUsdRate()).resolves.toBeNull();
    }
  });

  it("returns null on a timeout or network failure", async () => {
    fetchMock.mockRejectedValue(
      new DOMException("The operation timed out.", "TimeoutError"),
    );

    await expect(getZarToUsdRate()).resolves.toBeNull();
  });
});

describe("zarToUsd / formatUsd", () => {
  it("converts and rounds to the cent", () => {
    expect(zarToUsd(135, 0.0598)).toBe(8.07);
    expect(zarToUsd(1200, 0.0598)).toBe(71.76);
  });

  it("always shows two decimals", () => {
    expect(formatUsd(8.07)).toBe("$8.07");
    expect(formatUsd(72)).toBe("$72.00");
  });
});
