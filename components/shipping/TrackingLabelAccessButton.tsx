"use client";

import { Barcode } from "lucide-react";
import React from "react";

interface TrackingLabelAccessButtonProps {
  hasLabel: boolean;
  onViewLabels: () => void;
}

export function TrackingLabelAccessButton({
  hasLabel,
  onViewLabels,
}: TrackingLabelAccessButtonProps) {
  if (!hasLabel) return null;

  return (
    <button
      type="button"
      onClick={onViewLabels}
      className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Barcode className="mr-2 h-4 w-4" />
      View Labels
    </button>
  );
}
