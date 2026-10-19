import { Crown } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** Stands in for an AI button in an editor header when the user isn't Pro. */
export function AiProLock({ label }: { label: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-xs" asChild>
          <Link href="/upgrade" aria-label={`${label} — requires Pro`}>
            <Crown />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>AI features require Pro subscription</TooltipContent>
    </Tooltip>
  );
}
