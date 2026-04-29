// Single source of truth for the size and design "pill" badges shared
// between the orders board and the production planner. Edit a class or
// constant here and every site that renders these badges updates with it.

import { DesignBlends } from "@/typings/constants";

// Alpha applied to the design gradient when rendering a tag (dropdown
// trigger + planner card). Slightly translucent so the surface tint
// underneath shows through.
export const DESIGN_TAG_ALPHA = 0.8;

// Fallback gradient for any design not present in DesignBlends. Matches the
// dropdown's "Custom" option button so a custom name always reads the same
// way regardless of where it's rendered.
export const CUSTOM_DESIGN_GRADIENT =
  "linear-gradient(to right, #4b5563, #1f2937)";

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function createDesignBackground(name: string, alpha = 1): string {
  const colors = DesignBlends[name as keyof typeof DesignBlends];
  if (colors && colors.length > 0) {
    const stops =
      alpha < 1 ? colors.map((c) => hexToRgba(c, alpha)) : colors;
    return `linear-gradient(to right, ${stops.join(", ")})`;
  }
  return CUSTOM_DESIGN_GRADIENT;
}

// Tone = color + shadow + text-shadow. Geometry = padding/height/text/radius.
// Splitting them lets the dropdown popover render a roomier "full" pill and
// the cell trigger / planner card render the compact responsive pill, both
// from the same color treatment.
const SIZE_TONE =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)] bg-sky-500/80 dark:bg-sky-600/80";

const DESIGN_TONE =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.05)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_24%)]";

const PILL_GEOM_FULL =
  "inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium text-white rounded-[10px] border-transparent";

const PILL_GEOM_TRIGGER =
  "inline-flex items-center justify-center px-1.5 sm:px-3 h-5 sm:h-6 min-h-0 max-w-full truncate text-[0.625rem] sm:text-xs font-medium text-white rounded-lg sm:rounded-[10px] border-transparent";

// Interactive bits — append when rendering the pill as a button. Keep
// separate so static <div> renderings (e.g. the planner card) don't pick up
// hover lift / focus rings they shouldn't have.
export const PILL_INTERACTIVE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 transition-[transform,opacity,box-shadow] hover:opacity-95 hover:-translate-y-px active:translate-y-0";

export const PILL_SELECTED_RING =
  "ring-2 ring-blue-400 ring-offset-2 ring-offset-white dark:ring-offset-gray-900";

// Visual-only classes (no interactive states). Compose with PILL_INTERACTIVE
// for buttons.
export const SIZE_PILL_FULL = `${PILL_GEOM_FULL} ${SIZE_TONE}`;
export const SIZE_PILL_TRIGGER = `${PILL_GEOM_TRIGGER} ${SIZE_TONE}`;
export const DESIGN_PILL_FULL = `${PILL_GEOM_FULL} ${DESIGN_TONE}`;
export const DESIGN_PILL_TRIGGER = `${PILL_GEOM_TRIGGER} ${DESIGN_TONE}`;
