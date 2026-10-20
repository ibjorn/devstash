"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { resubscribe } from "@/actions/billing";
import { PlanOptions } from "@/components/settings/PlanOptions";
import type { Billing } from "@/lib/billing";
import { UNREACHABLE_MESSAGE } from "@/lib/messages";

interface ResubscribeOptionsProps {
  usdRate: number | null;
  periodEnd: string | null;
}

/**
 * Cancelled but still paid up: a new subscription on the saved card, starting
 * when this period ends. Stays on the page — there's no checkout to visit.
 */
export function ResubscribeOptions({
  usdRate,
  periodEnd,
}: ResubscribeOptionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<Billing | null>(null);

  async function choose(billing: Billing) {
    setPending(billing);
    try {
      const result = await resubscribe(billing);
      if (result.success) {
        toast.success(
          periodEnd
            ? `You're resubscribed — the first charge is on ${periodEnd}.`
            : "You're resubscribed.",
        );
        router.refresh();
      } else {
        toast.error(result.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      toast.error(UNREACHABLE_MESSAGE);
    }
    setPending(null);
  }

  return (
    <PlanOptions
      usdRate={usdRate}
      labels={{ monthly: "Resubscribe monthly", yearly: "Resubscribe yearly" }}
      pending={pending}
      onChoose={choose}
    />
  );
}
