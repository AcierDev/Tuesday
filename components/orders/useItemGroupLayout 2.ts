"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { ItemStatus } from "@/typings/types";

interface UseItemGroupLayoutArgs {
  groupTitle: string;
  isPreview: boolean;
  isCollapsed: boolean;
  itemCount: number;
}

interface RowPadding {
  side: "left" | "right" | null;
  px: number;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📐 NEW SECTION COLUMN ALIGNMENT                                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Two-column New layout: distribute the height delta across the shorter
// column's rows as extra padding-bottom so both columns end at the same Y.
// A ResizeObserver picks up content reflow (window resize, cell wrap).
export function useItemGroupLayout({
  groupTitle,
  isPreview,
  isCollapsed,
  itemCount,
}: UseItemGroupLayoutArgs) {
  const newLeftBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const newRightBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const [newRowPad, setNewRowPad] = useState<RowPadding>({
    side: null,
    px: 0,
  });

  useLayoutEffect(() => {
    if (
      groupTitle !== ItemStatus.New ||
      isPreview ||
      isCollapsed ||
      itemCount < 2
    ) {
      if (newRowPad.side !== null || newRowPad.px !== 0) {
        setNewRowPad({ side: null, px: 0 });
      }
      return;
    }
    const splitAt = Math.ceil(itemCount / 2);
    const leftCount = splitAt;
    const rightCount = itemCount - splitAt;
    if (leftCount === 0 || rightCount === 0) return;
    const leftEl = newLeftBodyRef.current;
    const rightEl = newRightBodyRef.current;
    if (!leftEl || !rightEl) return;

    const recompute = () => {
      const lRect = leftEl.getBoundingClientRect();
      const rRect = rightEl.getBoundingClientRect();
      const lH = lRect.height;
      const rH = rRect.height;
      // On narrow viewports the grid collapses to a single column and the
      // two tables stack vertically — no bottom alignment needed.
      if (Math.abs(lRect.top - rRect.top) > 4) {
        setNewRowPad((cur) =>
          cur.side === null && cur.px === 0 ? cur : { side: null, px: 0 }
        );
        return;
      }
      setNewRowPad((cur) => {
        const lApplied = cur.side === "left" ? cur.px * leftCount : 0;
        const rApplied = cur.side === "right" ? cur.px * rightCount : 0;
        const lRaw = lH - lApplied;
        const rRaw = rH - rApplied;
        const diff = lRaw - rRaw;
        // Fractional px: sub-pixel padding avoids the ceil-overshoot that
        // would leave one column slightly taller. Browsers handle decimals
        // in CSS lengths and round per-row consistently.
        if (Math.abs(diff) < 0.5) {
          return cur.side === null && cur.px === 0
            ? cur
            : { side: null, px: 0 };
        }
        if (diff > 0) {
          const px = diff / rightCount;
          return cur.side === "right" && Math.abs(cur.px - px) < 0.05
            ? cur
            : { side: "right", px };
        }
        const px = -diff / leftCount;
        return cur.side === "left" && Math.abs(cur.px - px) < 0.05
          ? cur
          : { side: "left", px };
      });
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(leftEl);
    ro.observe(rightEl);
    return () => ro.disconnect();
    // newRowPad is read via setState updater; excluding it keeps the effect
    // from re-running on every adjustment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupTitle, isPreview, isCollapsed, itemCount]);

  return { newLeftBodyRef, newRightBodyRef, newRowPad };
}
