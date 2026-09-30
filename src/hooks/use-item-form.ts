"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import type { ItemActionResult } from "@/actions/items";
import type { ItemFormValues } from "@/components/items/ItemFormFields";
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
 * `submit` resolves to the saved item, or null once it has reported a failure.
 * Only the action call is inside its `try`, and the caller's success handling
 * runs after `submit` returns — so a throw on the way back can never be
 * reported as "not saved" over a save that worked.
 */
export function useItemForm(initial: ItemFormValues) {
  const [values, setValues] = useState<ItemFormValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const handleChange = useCallback(
    (field: keyof ItemFormValues, value: string) => {
      setValues((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const reset = useCallback((next: ItemFormValues) => {
    setValues(next);
    setFieldErrors({});
  }, []);

  async function submit(
    call: () => Promise<ItemActionResult>,
    messages: SubmitMessages,
  ): Promise<ItemDetail | null> {
    setPending(true);
    setFieldErrors({});

    let result: ItemActionResult;
    try {
      result = await call();
    } catch {
      toast.error(messages.unreachable);
      return null;
    } finally {
      setPending(false);
    }

    if (!result.success || !result.data) {
      setFieldErrors(result.fieldErrors ?? {});
      // Field messages render beside their input, so a validation failure
      // needs no toast — only a failure with no field to blame does
      if (result.error) {
        toast.error(result.error);
      } else if (!result.fieldErrors) {
        toast.error(messages.failed);
      }
      return null;
    }

    return result.data;
  }

  return { values, handleChange, reset, fieldErrors, pending, submit };
}
