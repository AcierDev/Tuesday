// Single source of truth for the size and design "pill" badges shared
// between the orders board and the production planner. Edit a class or
// constant here and every site that renders these badges updates with it.

"use client";

import type { ReactNode } from "react";
import { DesignBlends } from "@/typings/constants";
import { ItemSizes } from "@/typings/types";

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
const SIZE_TONE_BASE =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_1px_2px_rgba(0,0,0,0.10)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_48%)] text-white";

// Per-height background tints. Heights 6 and 7 share cyan — the two shortest
// sizes (14×7, 16×6) read as the same short tier on the order board.
const SIZE_BG_BY_HEIGHT: Record<number, string> = {
  6: "bg-cyan-500/85 dark:bg-cyan-600/85",
  7: "bg-cyan-500/85 dark:bg-cyan-600/85",
  10: "bg-emerald-500/85 dark:bg-emerald-600/85",
  12: "bg-amber-500/85 dark:bg-amber-600/85",
  16: "bg-rose-500/85 dark:bg-rose-600/85",
};

const SIZE_BG_DEFAULT = "bg-sky-500/80 dark:bg-sky-600/80";

// Shipping-listed sizes are written with inch marks (e.g. 10" x 18"). They
// aren't part of the standard production size tiers, so they get a dark-oak
// brown fill to visually flag them as ship-only.
const SIZE_BG_INCH = "bg-[#5c3a24] dark:bg-[#4a2e1b]";

const SIZE_TONE = `${SIZE_TONE_BASE} ${SIZE_BG_DEFAULT}`;

const KNOWN_SIZES = new Set<string>(Object.values(ItemSizes));

function parseSizeWh(
  size: string | undefined | null
): { w: number; h: number } | null {
  const m = size?.trim().match(/^(\d+)\s*[x×X]\s*(\d+)$/);
  if (!m) return null;
  const w = parseInt(m[1] ?? "", 10);
  const h = parseInt(m[2] ?? "", 10);
  if (!w || !h) return null;
  return { w, h };
}

const KNOWN_HEIGHTS = [6, 7, 10, 12, 16] as const;

// Snap an arbitrary height to the nearest known height tier so a custom
// "32 x 12" still picks up the amber tone, and a "30 x 14" snaps to amber
// (height 12 wins the tie against 16 because the closer-to-zero tier wins).
function nearestKnownHeight(h: number): number {
  let best: number = KNOWN_HEIGHTS[0];
  let bestDist = Infinity;
  for (const known of KNOWN_HEIGHTS) {
    const d = Math.abs(h - known);
    if (d < bestDist) {
      bestDist = d;
      best = known;
    }
  }
  return best;
}

// Tone classes for a given size string. Order of preference:
//   1. Exact match in `ItemSizes`         → that height's background
//   2. Parseable custom WxH               → nearest known height's bg
//   3. Anything else (e.g. "Custom" text) → standard sky background
export function sizeToneClass(size: string | undefined | null): string {
  if (size?.includes('"')) {
    return `${SIZE_TONE_BASE} ${SIZE_BG_INCH}`;
  }
  const parsed = parseSizeWh(size);
  if (parsed) {
    const h = KNOWN_SIZES.has(size!)
      ? parsed.h
      : nearestKnownHeight(parsed.h);
    const bg = SIZE_BG_BY_HEIGHT[h];
    if (bg) return `${SIZE_TONE_BASE} ${bg}`;
  }
  return `${SIZE_TONE_BASE} ${SIZE_BG_DEFAULT}`;
}

// Mini grid of dots whose row/column counts mirror the size's tile pattern.
// Width drives columns and height drives rows, with the same divisor on both
// axes so the dot grid keeps the panel's aspect orientation (a 16×10 panel
// reads wider than tall). Renders for any parseable WxH — even custom sizes
// outside `ItemSizes`. Non-parseable strings (e.g. "Custom") return null.
const SIZE_DOT_INCHES_PER_DOT = 6;
const SIZE_DOT_MIN_COLS = 2;
const SIZE_DOT_MIN_ROWS = 1;

export function SizeTilePrefix({
  size,
}: {
  size: string | undefined | null;
}) {
  const parsed = parseSizeWh(size);
  if (!parsed) return null;
  const cols = Math.max(
    SIZE_DOT_MIN_COLS,
    Math.round(parsed.w / SIZE_DOT_INCHES_PER_DOT)
  );
  const rows = Math.max(
    SIZE_DOT_MIN_ROWS,
    Math.round(parsed.h / SIZE_DOT_INCHES_PER_DOT)
  );
  const dots: ReactNode[] = [];
  for (let i = 0; i < rows * cols; i++) {
    dots.push(
      <span
        key={i}
        className="block bg-white/95 rounded-full"
        style={{ width: "2px", height: "2px" }}
      />
    );
  }
  return (
    <span className="inline-flex items-center self-stretch flex-shrink-0">
      <span
        className="inline-grid"
        style={{
          gridTemplateColumns: `repeat(${cols}, 2px)`,
          gridAutoRows: "2px",
          gap: "1px",
        }}
        aria-hidden
      >
        {dots}
      </span>
    </span>
  );
}

// Convenience for callers that render the full pill themselves: spreads the
// standard "tone + tile-grid prefix + label" treatment into a single element.
export function SizePillContent({
  size,
}: {
  size: string | undefined | null;
}) {
  return (
    <>
      <SizeTilePrefix size={size} />
      <span className="truncate leading-none">{size || "Select Size"}</span>
    </>
  );
}

const DESIGN_TONE =
  "shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_1px_2px_rgba(0,0,0,0.05)] [text-shadow:_0_1px_2px_rgb(0_0_0_/_24%)]";

// `gap-1.5` reserves a little space between the tile-grid prefix and the
// size label. When there's no prefix (custom sizes / design pills) it just
// has no effect.
export const PILL_GEOM_FULL =
  "inline-flex items-center justify-center gap-1.5 px-3 h-6 min-h-0 text-xs font-medium text-white rounded-[10px] border-transparent";

export const PILL_GEOM_TRIGGER =
  "inline-flex items-center justify-center gap-1.5 px-1.5 sm:px-3 h-5 sm:h-6 min-h-0 max-w-full truncate text-[0.625rem] sm:text-xs font-medium text-white rounded-lg sm:rounded-[10px] border-transparent";

// Size pills get 10% less horizontal padding than the shared geometry, to
// tighten the gap between the badge edge and the text/dot-grid inside.
const SIZE_PILL_GEOM_FULL =
  "inline-flex items-center justify-center gap-1.5 px-[0.675rem] h-6 min-h-0 text-xs font-medium text-white rounded-[10px] border-transparent";

const SIZE_PILL_GEOM_TRIGGER =
  "inline-flex items-center justify-center gap-1.5 px-[0.3375rem] sm:px-[0.675rem] h-5 sm:h-6 min-h-0 max-w-full truncate text-[0.625rem] sm:text-xs font-medium text-white rounded-lg sm:rounded-[10px] border-transparent";

// Compose the geometry + per-height tone for a given size. The dropdown
// trigger and the planner card both call this so the active value's color
// matches the option list.
export function sizePillTriggerClass(
  size: string | undefined | null
): string {
  return `${SIZE_PILL_GEOM_TRIGGER} ${sizeToneClass(size)}`;
}

export function sizePillFullClass(size: string | undefined | null): string {
  return `${SIZE_PILL_GEOM_FULL} ${sizeToneClass(size)}`;
}

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
