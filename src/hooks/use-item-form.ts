"use client";

import { useCallback, useState } from "react";

import type { ItemActionResult } from "@/actions/items";
import type {
  ItemFormChange,
  ItemFormValues,
} from "@/components/items/ItemFormFields";
import { useActionRunner } from "@/hooks/use-action-runner";
import type { ItemDetail } from "@/types/items";

interface SubmitMessages {
  /** The action call itself threw — the request never got an answer. */
  unreachable: string;
  /** The action failed with neither a message nor a field to blame. */
  failed: string;
}

/**
 * State and submission shared by the New Item dialog and the drawer's edit
 * mode: the field values, per-field errors and the pending flag.
 *
 * `submit` resolves to the saved item, or null once it has reported a failure
 * — see useActionRunner for why the caller's success handling is safe.
 */
export function useItemForm(initial: ItemFormValues, onUpgrade?: () => void) {
  const [values, setValues] = useState<ItemFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { pending, run } = useActionRunner(onUpgrade);

  const handleChange = useCallback<ItemFormChange>((field, value) => {
    setValues((current) => ({ ...current, [field]: value }));
  }, []);

  const reset = useCallback((next: ItemFormValues) => {
    setValues(next);
    setFieldErrors({});
  }, []);

  async function submit(
    call: () => Promise<ItemActionResult>,
    messages: SubmitMessages,
  ): Promise<ItemDetail | null> {
    const result = await run(call, {
      ...messages,
      onFieldErrors: setFieldErrors,
    });
    return result?.data ?? null;
  }

  return { values, handleChange, reset, fieldErrors, pending, submit };
}
