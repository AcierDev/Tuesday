"use client";

import { type ReactNode } from "react";
import { ItemDesigns } from "@/typings/types";
import { DesignBlends } from "@/typings/constants";
import {
  SizeTilePrefix,
  createDesignBackground,
  sizeToneClass,
} from "@/components/ui/order-pills";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎯 COMBINED DESIGN + SIZE BADGE PREVIEW                               ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Six mockups for merging the size + design pills into a single visual unit
// so the eye doesn't have to track between two badges. Each row renders the
// same (design, size) sample set under one of the six approaches.

type Sample = { design: ItemDesigns | string; size: string };

const SAMPLES: Sample[] = [
  { design: ItemDesigns.Coastal, size: "24 x 10" },
  { design: ItemDesigns.Tidal, size: "16 x 10" },
  { design: ItemDesigns.Brisket, size: "32 x 16" },
  { design: ItemDesigns.Mint, size: "20 x 12" },
  { design: ItemDesigns.Spectrum, size: "40 x 16" },
  { design: ItemDesigns.Forest, size: "28 x 12" },
  { design: "Custom Mosaic", size: "32 x 12" }, // both fields off-menu
];

function parseWh(size: string): { w: number; h: number } | null {
  const m = size.trim().match(/^(\d+)\s*[x×X]\s*(\d+)$/);
  if (!m) return null;
  const w = parseInt(m[1] ?? "", 10);
  const h = parseInt(m[2] ?? "", 10);
  if (!w || !h) return null;
  return { w, h };
}

function designColors(design: string): string[] {
  return DesignBlends[design as ItemDesigns] ?? [];
}

function designGradient(design: string): string {
  return createDesignBackground(design, 0.92);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 1. STACKED ROWS                                                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function Variant1({ design, size }: Sample) {
  return (
    <div className="inline-flex flex-col rounded-[10px] overflow-hidden shadow-sm border border-black/10 dark:border-white/10 min-w-[160px]">
      <div
        className="px-2 py-1 text-xs font-semibold text-white truncate"
        style={{
          background: designGradient(design as string),
          textShadow: "0 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        {design}
      </div>
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 text-[0.625rem] font-medium ${sizeToneClass(size)}`}
      >
        <SizeTilePrefix size={size} />
        <span>{size}</span>
      </div>
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 2. SIDE-BY-SIDE SPLIT                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function Variant2({ design, size }: Sample) {
  return (
    <div className="inline-flex h-6 rounded-[10px] overflow-hidden shadow-sm border border-black/10 dark:border-white/10">
      <div
        className="flex items-center px-2 text-xs font-semibold text-white truncate max-w-[160px]"
        style={{
          background: designGradient(design as string),
          textShadow: "0 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        {design}
      </div>
      <div
        className={`flex items-center gap-1.5 px-2 text-[0.625rem] font-medium ${sizeToneClass(size)}`}
      >
        <SizeTilePrefix size={size} />
        <span>{size}</span>
      </div>
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 3. DESIGN GRADIENT WITH GRID PREFIX                                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function Variant3({ design, size }: Sample) {
  return (
    <span
      className="inline-flex items-center gap-1.5 h-6 rounded-[10px] px-3 text-xs font-semibold text-white shadow-sm border border-white/15"
      style={{
        background: designGradient(design as string),
        textShadow: "0 1px 2px rgba(0,0,0,0.45)",
      }}
    >
      <SizeTilePrefix size={size} />
      <span className="truncate max-w-[180px]">
        {design} · {size}
      </span>
    </span>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 4. GRID COLORED BY DESIGN (size encoded as grid, design as colors)    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function DesignColoredGrid({ design, size }: Sample) {
  const parsed = parseWh(size);
  const colors = designColors(design as string);
  if (!parsed || colors.length === 0) {
    return <SizeTilePrefix size={size} />;
  }
  const cols = Math.max(2, Math.round(parsed.w / 8));
  const rows = Math.max(1, Math.round(parsed.h / 4));
  const dots: ReactNode[] = [];
  for (let i = 0; i < rows * cols; i++) {
    // Walk through the design's color palette, repeating if needed.
    const color = colors[i % colors.length];
    dots.push(
      <span
        key={i}
        className="block rounded-full"
        style={{ width: "3px", height: "3px", backgroundColor: color }}
      />
    );
  }
  return (
    <span
      className="inline-grid flex-shrink-0"
      style={{
        gridTemplateColumns: `repeat(${cols}, 3px)`,
        gridAutoRows: "3px",
        gap: "1.5px",
      }}
      aria-hidden
    >
      {dots}
    </span>
  );
}

function Variant4({ design, size }: Sample) {
  return (
    <span className="inline-flex items-center gap-2 h-7 rounded-[10px] px-2.5 text-xs font-semibold bg-gray-900 text-white shadow-sm border border-white/10">
      <DesignColoredGrid design={design} size={size} />
      <span className="truncate max-w-[180px]">{design}</span>
      <span className="text-[0.6rem] font-medium text-white/55 tabular-nums">
        {size}
      </span>
    </span>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 5. OUTER COLOR RING + INNER DESIGN FILL                               ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function Variant5({ design, size }: Sample) {
  // Use the size-tone background as a 2px outer ring, design gradient inside.
  const tone = sizeToneClass(size);
  return (
    <span
      className={`inline-flex items-center justify-center rounded-[12px] p-[2px] ${tone}`}
    >
      <span
        className="inline-flex items-center gap-1.5 h-5 rounded-[9px] px-2 text-[0.625rem] font-semibold text-white"
        style={{
          background: designGradient(design as string),
          textShadow: "0 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        <span className="truncate max-w-[140px]">{design}</span>
        <span className="text-white/85 tabular-nums">{size}</span>
      </span>
    </span>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 6. FLOATING SIZE CHIP ON DESIGN PILL                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function Variant6({ design, size }: Sample) {
  return (
    <span className="relative inline-flex items-center pr-3 pl-2.5">
      <span
        className="inline-flex items-center h-7 rounded-[10px] pl-2.5 pr-7 text-xs font-semibold text-white shadow-sm border border-white/15 truncate max-w-[200px]"
        style={{
          background: designGradient(design as string),
          textShadow: "0 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        {design}
      </span>
      <span
        className={`absolute -right-0 -top-1 inline-flex items-center gap-1 h-4 rounded-[6px] px-1 text-[0.55rem] font-bold tabular-nums shadow ${sizeToneClass(size)}`}
      >
        <SizeTilePrefix size={size} />
        <span>{size}</span>
      </span>
    </span>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔄 FLIPPED VARIANTS — size is the dominant element instead of design  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Same six layouts, but the size and design swap visual hierarchy. The
// height-tier color drives the pill, the design retreats to a swatch /
// secondary line / inner fill / floating chip.

function DesignSwatch({ design }: { design: string }) {
  return (
    <span
      className="inline-block flex-shrink-0 rounded-[3px] ring-1 ring-white/40"
      style={{
        width: "10px",
        height: "10px",
        background: designGradient(design),
      }}
      aria-hidden
    />
  );
}

function Variant7({ design, size }: Sample) {
  return (
    <div className="inline-flex flex-col rounded-[10px] overflow-hidden shadow-sm border border-black/10 dark:border-white/10 min-w-[160px]">
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 text-[0.625rem] font-medium ${sizeToneClass(size)}`}
      >
        <SizeTilePrefix size={size} />
        <span>{size}</span>
      </div>
      <div
        className="px-2 py-1 text-xs font-semibold text-white truncate"
        style={{
          background: designGradient(design as string),
          textShadow: "0 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        {design}
      </div>
    </div>
  );
}

function Variant8({ design, size }: Sample) {
  return (
    <div className="inline-flex h-6 rounded-[10px] overflow-hidden shadow-sm border border-black/10 dark:border-white/10">
      <div
        className={`flex items-center gap-1.5 px-2 text-[0.625rem] font-medium ${sizeToneClass(size)}`}
      >
        <SizeTilePrefix size={size} />
        <span>{size}</span>
      </div>
      <div
        className="flex items-center px-2 text-xs font-semibold text-white truncate max-w-[160px]"
        style={{
          background: designGradient(design as string),
          textShadow: "0 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        {design}
      </div>
    </div>
  );
}

function Variant9({ design, size }: Sample) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 rounded-[10px] px-2.5 text-xs font-semibold border border-white/15 shadow-sm ${sizeToneClass(size)}`}
    >
      <DesignSwatch design={design as string} />
      <SizeTilePrefix size={size} />
      <span className="truncate max-w-[180px] tabular-nums">
        {size} · {design}
      </span>
    </span>
  );
}

function Variant10({ design, size }: Sample) {
  // Flip of #4: same dual-encoding grid, but rotated 90° so it reads as a
  // tall ribbon (rows ≈ w/4, cols ≈ h/8). Plus the pill itself is height-
  // colored instead of neutral, so the size signal is everywhere.
  const parsed = parseWh(size);
  const colors = designColors(design as string);
  const renderGrid = () => {
    if (!parsed || colors.length === 0) return <SizeTilePrefix size={size} />;
    const cols = Math.max(1, Math.round(parsed.h / 8));
    const rows = Math.max(2, Math.round(parsed.w / 4));
    const dots: ReactNode[] = [];
    for (let i = 0; i < rows * cols; i++) {
      dots.push(
        <span
          key={i}
          className="block rounded-full"
          style={{
            width: "3px",
            height: "3px",
            backgroundColor: colors[i % colors.length],
          }}
        />
      );
    }
    return (
      <span
        className="inline-grid flex-shrink-0"
        style={{
          gridTemplateColumns: `repeat(${cols}, 3px)`,
          gridAutoRows: "3px",
          gap: "1.5px",
        }}
        aria-hidden
      >
        {dots}
      </span>
    );
  };
  return (
    <span
      className={`inline-flex items-center gap-2 h-7 rounded-[10px] px-2.5 text-xs font-semibold shadow-sm border border-white/10 ${sizeToneClass(size)}`}
    >
      {renderGrid()}
      <span className="truncate max-w-[180px] tabular-nums">{size}</span>
      <span className="text-[0.6rem] font-medium opacity-75 truncate max-w-[120px]">
        {design}
      </span>
    </span>
  );
}

function Variant11({ design, size }: Sample) {
  // Outer ring = design gradient, inner fill = size-tier color.
  return (
    <span
      className="inline-flex items-center justify-center rounded-[12px] p-[2px] shadow-sm"
      style={{ background: designGradient(design as string) }}
    >
      <span
        className={`inline-flex items-center gap-1.5 h-5 rounded-[9px] px-2 text-[0.625rem] font-semibold ${sizeToneClass(size)}`}
      >
        <SizeTilePrefix size={size} />
        <span className="tabular-nums">{size}</span>
        <span className="opacity-75 truncate max-w-[110px]">{design}</span>
      </span>
    </span>
  );
}

function Variant12({ design, size }: Sample) {
  // Main pill = height color + size grid + size text. Small design chip
  // floats on the top-right.
  return (
    <span className="relative inline-flex items-center pr-3 pl-1">
      <span
        className={`inline-flex items-center gap-1.5 h-7 rounded-[10px] pl-2.5 pr-7 text-xs font-semibold shadow-sm border border-white/15 ${sizeToneClass(size)}`}
      >
        <SizeTilePrefix size={size} />
        <span className="tabular-nums">{size}</span>
      </span>
      <span
        className="absolute -right-0 -top-1 inline-flex items-center h-4 rounded-[6px] px-1.5 text-[0.55rem] font-bold text-white shadow truncate max-w-[110px] border border-white/20"
        style={{
          background: designGradient(design as string),
          textShadow: "0 1px 2px rgba(0,0,0,0.4)",
        }}
      >
        {design}
      </span>
    </span>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🃏 IN-CONTEXT CARD MOCK — mirrors the planner OrderCard layout       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Same shape as components/production-planning/OrderCard.tsx so each
// variant renders next to a real customer name + status stripe + due badge.

type CardSample = {
  customerName: string;
  design: string;
  size: string;
  dueDays: number;
  statusColor: string;
  statusTint: string;
};

const CARD_SAMPLES: CardSample[] = [
  {
    customerName: "Vijaya Singh",
    design: "Brisket",
    size: "32 x 12",
    dueDays: 2,
    statusColor: "border-l-orange-500",
    statusTint: "bg-orange-50 dark:bg-orange-950/40",
  },
  {
    customerName: "Sarah Chen",
    design: "Coastal Dream",
    size: "24 x 10",
    dueDays: 5,
    statusColor: "border-l-gray-400 dark:border-l-gray-500",
    statusTint: "bg-white dark:bg-gray-900",
  },
  {
    customerName: "Mike Johnson",
    design: "Spectrum",
    size: "40 x 16",
    dueDays: 9,
    statusColor: "border-l-red-500",
    statusTint: "bg-red-50 dark:bg-red-950/40",
  },
];

function MockOrderCard({
  sample,
  badge,
}: {
  sample: CardSample;
  badge: ReactNode;
}) {
  const dueColor =
    sample.dueDays <= 3
      ? "bg-red-500 text-white"
      : sample.dueDays <= 7
        ? "bg-amber-500 text-white"
        : "bg-emerald-500 text-white";
  return (
    <div
      className={`relative overflow-hidden rounded-md border-y border-r border-gray-200 dark:border-gray-800 border-l-[3px] ${sample.statusColor} ${sample.statusTint} shadow-sm w-[300px]`}
    >
      <div className="flex items-start justify-between gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug truncate">
            {sample.customerName}
          </div>
          <div className="flex items-center gap-1.5">{badge}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <div className="h-6 w-6" aria-hidden />
          <span
            className={`inline-flex items-center justify-center min-w-[28px] h-5 px-1.5 rounded-md text-[10px] font-bold tabular-nums shadow-sm ${dueColor}`}
          >
            {sample.dueDays}d
          </span>
        </div>
      </div>
    </div>
  );
}

const VARIANTS: Array<{
  name: string;
  description: string;
  render: (sample: Sample) => ReactNode;
}> = [
  {
    name: "1. Two-row stacked pill",
    description:
      "One rounded container, two horizontal bands. Top = design gradient + name. Bottom = height color + tile grid + size.",
    render: (s) => <Variant1 {...s} />,
  },
  {
    name: "2. Side-by-side split pill",
    description:
      "Single rounded shell, vertical seam down the middle. Left half = design, right half = size.",
    render: (s) => <Variant2 {...s} />,
  },
  {
    name: "3. Design-gradient pill with size grid prefix",
    description:
      "Background = design gradient. Inline tile-grid prefix encodes size. Text: design · size.",
    render: (s) => <Variant3 {...s} />,
  },
  {
    name: "4. Grid colored by design (size = grid shape, design = grid colors)",
    description:
      "Tile grid is sized by the order's dimensions and each dot is colored by the design's palette. Most compact, most novel.",
    render: (s) => <Variant4 {...s} />,
  },
  {
    name: "5. Outer color ring + inner design fill",
    description:
      "2px height-color ring wraps a design-gradient interior. Like a coin: rim and face carry different meanings.",
    render: (s) => <Variant5 {...s} />,
  },
  {
    name: "6. Floating size chip on design pill",
    description:
      "Full-width design pill with a small height-colored chip overlapping the top-right corner. Easiest to retrofit.",
    render: (s) => <Variant6 {...s} />,
  },
  // ─── Flipped versions ───────────────────────────────────────────────
  {
    name: "7. Stacked — size on top, design below",
    description:
      "Flip of #1: size band leads, design row sits underneath. Use when the size is the more operationally critical detail.",
    render: (s) => <Variant7 {...s} />,
  },
  {
    name: "8. Split — size on left, design on right",
    description:
      "Flip of #2: size half is read first.",
    render: (s) => <Variant8 {...s} />,
  },
  {
    name: "9. Size-color pill with design swatch prefix",
    description:
      "Flip of #3: pill is the height-tier color. A small design-gradient swatch sits at the front so you still see the design.",
    render: (s) => <Variant9 {...s} />,
  },
  {
    name: "10. Rotated dual-encoding grid (size dominant)",
    description:
      "Flip of #4: the dual-encoding grid is rotated 90° (tall ribbon) and the pill body is height-colored — size carries everything, design is a secondary text line.",
    render: (s) => <Variant10 {...s} />,
  },
  {
    name: "11. Design-gradient ring + size-color fill",
    description:
      "Flip of #5: now the outer ring is the design gradient and the inner fill is the size color. Looks like a coin with a colorful rim.",
    render: (s) => <Variant11 {...s} />,
  },
  {
    name: "12. Floating design chip on size pill",
    description:
      "Flip of #6: the main pill is height-colored with the size, and a small design-gradient chip floats on the corner.",
    render: (s) => <Variant12 {...s} />,
  },
];

export default function BadgeCombinePreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Combined Design + Size Badge — 6 Approaches
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Each row shows one approach applied to a representative spread of
            (design, size) pairs — including a custom design + custom size at
            the end so you can see how each variant degrades.
          </p>
        </header>

        <div className="space-y-4">
          {VARIANTS.map((variant) => (
            <section
              key={variant.name}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"
            >
              <div className="mb-3 space-y-0.5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {variant.name}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {variant.description}
                </p>
              </div>
              <div className="flex flex-wrap items-start gap-3">
                {SAMPLES.map((sample, i) => (
                  <div
                    key={`${sample.design}-${sample.size}-${i}`}
                    className="flex flex-col items-start gap-1"
                  >
                    {variant.render(sample)}
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                      {sample.design} · {sample.size}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <header className="space-y-2 pt-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            On a real order card
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Same six variants, this time embedded inside a mock that mirrors
            the planner <code className="font-mono">OrderCard</code> layout
            (status stripe, customer name, due-day badge). Compare how each
            variant sits next to the customer name and within the card
            chrome — that's where you'll actually see them in production.
          </p>
        </header>

        <div className="space-y-4">
          {VARIANTS.map((variant) => (
            <section
              key={`ctx-${variant.name}`}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"
            >
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                {variant.name}
              </h3>
              <div className="flex flex-wrap items-start gap-3">
                {CARD_SAMPLES.map((sample) => (
                  <MockOrderCard
                    key={`${variant.name}-${sample.customerName}`}
                    sample={sample}
                    badge={variant.render({
                      design: sample.design,
                      size: sample.size,
                    })}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="pt-4 pb-8 text-xs text-gray-500 dark:text-gray-400">
          Tell me which number you want and I'll wire it into the planner card
          (and the orders board if you want it there too) — replacing the
          two separate pills with the chosen combined element.
        </footer>
      </div>
    </div>
  );
}
