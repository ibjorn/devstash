"use client";

import { useState } from "react";
import { toast } from "sonner";

import { UNREACHABLE_MESSAGE } from "@/lib/messages";
import type { BillingActionResult } from "@/types/billing";

/**
 * Runs a billing action and follows the URL it returns off-site. The pending
 * state is deliberately left on after success, so the button can't be pressed
 * again while the browser is leaving for Paystack.
 */
export function useRedirectAction() {
  const [pending, setPending] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<BillingActionResult>) {
    setPending(key);
    try {
      const result = await action();
      if (result.success && result.data) {
        window.location.assign(result.data.url);
        return;
      }
      toast.error(result.error ?? "Something went wrong. Please try again.");
    } catch {
      toast.error(UNREACHABLE_MESSAGE);
    }
    setPending(null);
  }

  return { pending, run };
}
