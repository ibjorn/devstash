"use client";

import { useState } from "react";

import { useErrorToast } from "@/hooks/use-error-toast";
import { UNREACHABLE_MESSAGE } from "@/lib/messages";
import type { ActionResult } from "@/types/actions";

export interface RunMessages {
  /** The action failed with neither a message nor a field to blame. */
  failed: string;
  /** The action call itself threw — the request never got an answer. */
  unreachable?: string;
  /**
   * Given the failed result's field errors (`{}` when there are none). With
   * this set, a failure that blames a field gets no toast — its message
   * renders beside the input instead.
   */
  onFieldErrors?: (errors: Record<string, string>) => void;
}

export type SuccessResult<T> = ActionResult<T> & { success: true };

/**
 * Runs a server action with the pending flag and the failure toasts every
 * form and confirm dialog needs. `onUpgrade` runs before the toast's Upgrade
 * navigates, so a dialog can close itself first.
 *
 * `run` resolves to the result when it succeeded, or null once it has
 * reported a failure. Only the action call is inside its `try`, and the
 * caller's success handling runs after `run` returns — so a throw on the way
 * back can never be toasted as a failure over an action that worked.
 */
export function useActionRunner(onUpgrade?: () => void) {
  const [pending, setPending] = useState(false);
  const showError = useErrorToast(onUpgrade);

  async function run<T>(
    call: () => Promise<ActionResult<T>>,
    { failed, unreachable = UNREACHABLE_MESSAGE, onFieldErrors }: RunMessages,
  ): Promise<SuccessResult<T> | null> {
    setPending(true);
    onFieldErrors?.({});

    let result: ActionResult<T>;
    try {
      result = await call();
    } catch {
      showError(unreachable);
      return null;
    } finally {
      setPending(false);
    }

    if (!result.success) {
      onFieldErrors?.(result.fieldErrors ?? {});
      if (result.error) {
        showError(result.error, result.upgrade);
      } else if (!(onFieldErrors && result.fieldErrors)) {
        showError(failed);
      }
      return null;
    }

    return result as SuccessResult<T>;
  }

  return { pending, run };
}

export type RunAction = ReturnType<typeof useActionRunner>["run"];
