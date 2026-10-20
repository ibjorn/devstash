"use client";

import { Loader2 } from "lucide-react";
import { useState, type MouseEvent } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useActionRunner } from "@/hooks/use-action-runner";
import type { ActionResult } from "@/types/actions";

interface ConfirmDeleteDialogProps {
  title: string;
  description: React.ReactNode;
  /** The delete itself. */
  action: () => Promise<ActionResult<unknown>>;
  /** Toasted when the delete fails with no message of its own. */
  failed: string;
  /** Runs once the delete has succeeded and the dialog has closed. */
  onDeleted: () => void;
  /** Opens the dialog. Omit it and pass `open` to control it instead. */
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * The confirm-then-delete dialog behind every Delete button. It stays open
 * until the delete has succeeded, and can't be dismissed while one is in
 * flight — closing would only hide the outcome of a request that's still
 * going to land.
 */
export function ConfirmDeleteDialog({
  title,
  description,
  action,
  failed,
  onDeleted,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: ConfirmDeleteDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const { pending, run } = useActionRunner();

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  function handleOpenChange(next: boolean) {
    if (!pending) setOpen(next);
  }

  async function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    // AlertDialogAction closes the dialog on click by default; hold it open
    // until the delete has actually succeeded
    event.preventDefault();

    const result = await run(action, { failed });
    if (!result) return;

    setOpen(false);
    onDeleted();
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={handleConfirm}
            disabled={pending}
          >
            {pending && <Loader2 className="size-4 animate-spin" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
