"use client";

import { DatabaseZap, RefreshCw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <DatabaseZap className="size-6" />
      </div>
      <div className="space-y-2">
        <h1 className="text-lg font-semibold">Couldn&apos;t reach the database</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The database may be waking from sleep. This usually resolves in a few
          seconds — try again.
        </p>
      </div>
      <Button onClick={reset} variant="outline">
        <RefreshCw />
        Try again
      </Button>
    </div>
  );
}
