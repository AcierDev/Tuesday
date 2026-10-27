"use client";

import React from "react";
import { needsEtsyImportReview } from "@/lib/etsy/import-review";
import type { Item } from "@/typings/types";

const BADGE_CLASSES =
  "inline-flex h-[0.89375rem] shrink-0 items-center rounded-sm bg-fuchsia-500/20 px-1.5 text-[0.5rem] font-bold uppercase leading-none tracking-wider text-fuchsia-800 ring-1 ring-inset ring-fuchsia-500/30 dark:text-fuchsia-300";
const FULL_LABEL = "Etsy import - check messages";

/** Shown until the imported order is opened or edited. */
export function EtsyImportReviewBadge({ item }: { item: Item }) {
  return needsEtsyImportReview(item) ? (
    <span className={BADGE_CLASSES} title={FULL_LABEL} aria-label={FULL_LABEL}>
      <span className="sm:hidden">Etsy import</span>
      <span className="hidden sm:inline">{FULL_LABEL}</span>
    </span>
  ) : null;
}
