"use client";

import * as React from "react";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 SHARED SETTINGS SLIDER STYLES                                      ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Blue pill thumb + filled range, with a "grab" pop animation on :active.
// Targets the Radix Slider DOM: Root > Track(span) > Range(span); thumb has role=slider.
export const SETTINGS_SLIDER_CLASSES = [
  "flex-1",
  // Filled range (blue)
  "[&>span:first-child]:bg-blue-950/50",
  "[&>span:first-child>span]:bg-gradient-to-r",
  "[&>span:first-child>span]:from-blue-500",
  "[&>span:first-child>span]:to-blue-400",
  // Thumb pill
  "[&_[role=slider]]:h-5",
  "[&_[role=slider]]:w-10",
  "[&_[role=slider]]:border-0",
  "[&_[role=slider]]:rounded-full",
  "[&_[role=slider]]:bg-gradient-to-b",
  "[&_[role=slider]]:from-blue-400",
  "[&_[role=slider]]:to-blue-600",
  "[&_[role=slider]]:shadow-md",
  "[&_[role=slider]]:shadow-blue-900/40",
  "[&_[role=slider]]:cursor-grab",
  "[&_[role=slider]]:transition-transform",
  "[&_[role=slider]]:duration-150",
  "[&_[role=slider]]:ease-out",
  // Hover
  "[&_[role=slider]:hover]:from-blue-300",
  "[&_[role=slider]:hover]:to-blue-500",
  // Grab animation
  "[&_[role=slider]:active]:scale-125",
  "[&_[role=slider]:active]:cursor-grabbing",
  "[&_[role=slider]:active]:shadow-lg",
  "[&_[role=slider]:active]:shadow-blue-500/60",
  "[&_[role=slider]:active]:from-blue-300",
  "[&_[role=slider]:active]:to-blue-500",
  // Focus ring (blue)
  "[&_[role=slider]:focus-visible]:ring-2",
  "[&_[role=slider]:focus-visible]:ring-blue-400",
  "[&_[role=slider]:focus-visible]:ring-offset-2",
].join(" ");

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⏸️ DRAFT-VALUE HOOK (commit on release)                               ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Tracks an in-progress slider value; only fires onCommit when the user lets go.
export function useSliderDraft(
  committed: number,
  onCommit: (value: number) => void
) {
  const [draft, setDraft] = React.useState(committed);

  React.useEffect(() => {
    setDraft(committed);
  }, [committed]);

  return {
    draft,
    setDraft,
    handleValueChange: (v: number[]) => {
      if (v[0] !== undefined) setDraft(v[0]);
    },
    handleValueCommit: (v: number[]) => {
      if (v[0] !== undefined) onCommit(v[0]);
    },
  };
}
