import { getPlanUsage } from "@/lib/db/entitlements";
import {
  DENIAL_MESSAGES,
  type Denial,
  type PlanUsage,
} from "@/lib/entitlements";
import type { ActionResult } from "@/types/actions";

/**
 * The plan check shared by the server actions that create something. Returns
 * the refusal to hand back, or null when the create may go ahead. A missing
 * plan means the session outlived its user row, so it gets the same answer as
 * no session at all.
 */
export async function planDenial(
  userId: string,
  check: (plan: PlanUsage) => Denial | null,
  signedOut: string,
): Promise<ActionResult | null> {
  const plan = await getPlanUsage(userId);
  if (!plan) return { success: false, error: signedOut };

  const denied = check(plan);
  if (denied) {
    return { success: false, error: DENIAL_MESSAGES[denied], upgrade: true };
  }
  return null;
}
