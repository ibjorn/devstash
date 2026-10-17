"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";

/**
 * toast.error, plus an Upgrade action when the plan caused the refusal — the
 * `upgrade` flag create actions and the upload route return. `onUpgrade` runs
 * first, so a dialog can close itself rather than sit over the upgrade page.
 */
export function useErrorToast(onUpgrade?: () => void) {
  const router = useRouter();

  return useCallback(
    (message: string, upgrade?: boolean) => {
      toast.error(
        message,
        upgrade
          ? {
              action: {
                label: "Upgrade",
                onClick: () => {
                  onUpgrade?.();
                  router.push("/upgrade");
                },
              },
            }
          : undefined,
      );
    },
    [router, onUpgrade],
  );
}
