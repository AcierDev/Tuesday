"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/client-errors";

// Page-level error boundary: reports the failure and keeps the app shell, so
// the user can retry without a full reload.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError("error-boundary", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-lg font-semibold text-gray-100">Something went wrong on this page.</h2>
      <p className="text-sm text-gray-400">The error was reported. Try again, or reload if it keeps happening.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
