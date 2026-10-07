"use client";

import { useTuesdayScanContext } from "./TuesdayScanProvider";

export function useTuesdayScan() {
  const context = useTuesdayScanContext();
  if (!context) throw new Error("TuesdayScanProvider is required for automatic checks.");
  return { ...context.scan, filterSearchResponse: context.filterSearchResponse };
}
