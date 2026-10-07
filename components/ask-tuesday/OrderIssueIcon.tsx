"use client";

import React, { useEffect } from "react";
import { CircleAlert } from "lucide-react";
import { ItemStatus, type Item } from "@/typings/types";
import { useTuesdayScanContext } from "./TuesdayScanProvider";
import { cn } from "@/utils/functions";

const EMPTY_COUNT = 0;
const SINGLE_ISSUE_COUNT = 1;

export function OrderIssueIcon({ item, className }: { item: Pick<Item, "id" | "status" | "customerName">; className?: string }) {
  const context = useTuesdayScanContext();
  const ignored = item.status === ItemStatus.Done || item.status === ItemStatus.Hidden;
  const dismiss = context?.dismissOrderIssues;
  useEffect(() => { if (ignored) dismiss?.(item.id); }, [ignored, item.id, dismiss]);
  useEffect(() => () => dismiss?.(item.id), [item.id, dismiss]);
  const issues = context?.issuesByOrder.get(item.id) ?? [];
  if (!context || ignored || issues.length === EMPTY_COUNT) return null;
  const stale = !!context.scan.error || context.scan.response?.status === "unavailable";
  const description = `${issues.length} issue${issues.length === SINGLE_ISSUE_COUNT ? "" : "s"} for ${item.customerName || "order"} ${item.id}`;
  const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation();
  return <button type="button" aria-label={`Show ${description}`} aria-haspopup="dialog"
    title={stale ? "Last findings — current checks are unavailable" : issues.map((issue) => issue.detail).join("\n")}
    onPointerDownCapture={stopPropagation} onPointerDown={stopPropagation} onMouseDown={stopPropagation}
    onTouchStart={stopPropagation} onKeyDown={stopPropagation}
    onClick={(event) => { event.stopPropagation(); context.showOrderIssues(item, event.currentTarget); }}
    className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-amber-300 hover:bg-amber-300/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300", className)}>
    <CircleAlert aria-hidden="true" className="h-4 w-4" />
  </button>;
}
