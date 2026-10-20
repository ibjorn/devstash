import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PendingButtonProps extends React.ComponentProps<typeof Button> {
  /** Shows a spinner before the label and disables the button. */
  pending: boolean;
}

/** A Button that spins and disables itself while its request is in flight. */
export function PendingButton({
  pending,
  disabled,
  children,
  ...props
}: PendingButtonProps) {
  return (
    <Button disabled={disabled || pending} {...props}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
