"use client";

import { type CSSProperties, type ReactNode } from "react";
import { ItemSizes } from "@/typings/types";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 SIZE PILL COLOR SCHEME PREVIEW                                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Twenty options for color-coding the size pill. All schemes only color the
// 12 sizes defined in `ItemSizes` — anything else (custom / off-menu sizes)
// falls back to the standard sky-blue badge that today is used universally.

const KNOWN_SIZES = Object.values(ItemSizes) as string[];

const SAMPLE_SIZES: string[] = [...KNOWN_SIZES, "Custom"];

type Tone = { className?: string; style?: CSSProperties; prefix?: ReactNode };

const STANDARD_BLUE: Tone = {
  className: "bg-sky-500/85 text-white border-transparent",
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📏 PER-HEIGHT COLOR PALETTE                                           ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// One color per height. Heights 6 and 7 share a color (the two shortest
// sizes — 14×7 and 16×6 — read as "the same tier"). Custom = blue.

const HEIGHT_BG: Record<number, string> = {
  6: "bg-cyan-500/85 text-white",
  7: "bg-cyan-500/85 text-white",
  10: "bg-emerald-500/85 text-white",
  12: "bg-amber-500/85 text-white",
  16: "bg-rose-500/85 text-white",
};

const HEIGHT_HEX: Record<number, string> = {
  6: "rgb(6 182 212)", // cyan-500
  7: "rgb(6 182 212)", // cyan-500 — shared with 6
  10: "rgb(16 185 129)", // emerald-500
  12: "rgb(245 158 11)", // amber-500
  16: "rgb(244 63 94)", // rose-500
};

function heightTone(size: string): Tone {
  if (!isKnown(size)) return STANDARD_BLUE;
  const p = parse(size);
  if (!p) return STANDARD_BLUE;
  const cls = HEIGHT_BG[p.h];
  if (!cls) return STANDARD_BLUE;
  return { className: `${cls} border-transparent` };
}

function heightHex(size: string): string | null {
  if (!isKnown(size)) return null;
  const p = parse(size);
  if (!p) return null;
  return HEIGHT_HEX[p.h] ?? null;
}

function parse(size: string): { w: number; h: number; sq: number } | null {
  const m = size.trim().match(/^(\d+)\s*[x×X]\s*(\d+)$/);
  if (!m) return null;
  const w = parseInt(m[1] ?? "", 10);
  const h = parseInt(m[2] ?? "", 10);
  if (!w || !h) return null;
  return { w, h, sq: w * h };
}

function isKnown(size: string): boolean {
  return KNOWN_SIZES.includes(size);
}

const PILL_GEOM =
  "inline-flex items-center justify-center px-3 h-6 min-h-0 text-xs font-medium rounded-[10px] border";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪣 5-TIER BUCKETING (computed across the known-size square range)     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Square counts of the 12 known sizes range from 96 (16×6) to 640 (40×16).
// Five tiers split that range into roughly even-ish bands.
const SQ_TIERS = [120, 220, 340, 480];

function tierIndex(size: string): number {
  const p = parse(size);
  if (!p) return -1;
  for (let i = 0; i < SQ_TIERS.length; i++) {
    if (p.sq <= SQ_TIERS[i]!) return i;
  }
  return SQ_TIERS.length;
}

function tiered(size: string, palette: string[]): Tone {
  if (!isKnown(size)) return STANDARD_BLUE;
  const idx = tierIndex(size);
  if (idx < 0) return STANDARD_BLUE;
  return { className: `${palette[idx]} border-transparent` };
}

const SCHEMES: Array<{
  name: string;
  description: string;
  tone: (size: string) => Tone;
}> = [
  {
    name: "1. Cool → warm (square count)",
    description:
      "5 tiers from total area: slate · sky · emerald · amber · rose. Custom = blue.",
    tone: (s) =>
      tiered(s, [
        "bg-slate-500/85 text-white",
        "bg-sky-500/85 text-white",
        "bg-emerald-500/85 text-white",
        "bg-amber-500/85 text-white",
        "bg-rose-500/85 text-white",
      ]),
  },
  {
    name: "2. Heatmap (blue → red)",
    description:
      "Classic heat: small is cool, big is hot. Reads like a thermometer.",
    tone: (s) =>
      tiered(s, [
        "bg-blue-500/85 text-white",
        "bg-cyan-500/85 text-white",
        "bg-yellow-500/85 text-black",
        "bg-orange-500/85 text-white",
        "bg-red-500/85 text-white",
      ]),
  },
  {
    name: "3. Sequential mono — blue",
    description:
      "Single hue, lightness varies with size. Calmest, very glanceable.",
    tone: (s) =>
      tiered(s, [
        "bg-blue-200 text-blue-900",
        "bg-blue-400 text-white",
        "bg-blue-600 text-white",
        "bg-blue-800 text-white",
        "bg-blue-950 text-white",
      ]),
  },
  {
    name: "4. Sequential mono — purple",
    description: "Same as #3 but in violet, useful if blue is reserved.",
    tone: (s) =>
      tiered(s, [
        "bg-purple-200 text-purple-900",
        "bg-purple-400 text-white",
        "bg-purple-600 text-white",
        "bg-purple-800 text-white",
        "bg-purple-950 text-white",
      ]),
  },
  {
    name: "5. Pastel buckets",
    description: "Soft, low-saturation tones. Less visual noise on a busy board.",
    tone: (s) =>
      tiered(s, [
        "bg-slate-200 text-slate-700 border-slate-300",
        "bg-sky-200 text-sky-900 border-sky-300",
        "bg-emerald-200 text-emerald-900 border-emerald-300",
        "bg-amber-200 text-amber-900 border-amber-300",
        "bg-rose-200 text-rose-900 border-rose-300",
      ]),
  },
  {
    name: "6. Vibrant buckets",
    description: "High-saturation jewel tones — maximum signal, more visual weight.",
    tone: (s) =>
      tiered(s, [
        "bg-cyan-500 text-white",
        "bg-lime-500 text-black",
        "bg-amber-500 text-black",
        "bg-fuchsia-600 text-white",
        "bg-indigo-700 text-white",
      ]),
  },
  {
    name: "7. Earth tones",
    description: "Wood-shop palette: sand, olive, ochre, terracotta, mahogany.",
    tone: (s) =>
      tiered(s, [
        "bg-stone-300 text-stone-800",
        "bg-yellow-700/80 text-white",
        "bg-orange-700/85 text-white",
        "bg-red-800/85 text-white",
        "bg-amber-950 text-white",
      ]),
  },
  {
    name: "8. Sunset",
    description: "Yellow → orange → red → magenta → purple. Warm and ordered.",
    tone: (s) =>
      tiered(s, [
        "bg-yellow-400 text-yellow-900",
        "bg-orange-500 text-white",
        "bg-red-500 text-white",
        "bg-pink-600 text-white",
        "bg-purple-700 text-white",
      ]),
  },
  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 📐 WIDTH / ASPECT BASED                                              ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  {
    name: "9. By width tier",
    description:
      "Color encodes width only. 14/16/20/24/28/32/36/40 → 5 width bands.",
    tone: (s) => {
      if (!isKnown(s)) return STANDARD_BLUE;
      const p = parse(s);
      if (!p) return STANDARD_BLUE;
      const cls =
        p.w <= 14
          ? "bg-teal-500/85 text-white"
          : p.w <= 20
            ? "bg-sky-500/85 text-white"
            : p.w <= 24
              ? "bg-indigo-500/85 text-white"
              : p.w <= 32
                ? "bg-violet-600/85 text-white"
                : "bg-rose-600/85 text-white";
      return { className: `${cls} border-transparent` };
    },
  },
  {
    name: "10. By height (one color per tier)",
    description:
      "Four colors for the four height tiers. 6/7=cyan · 10=emerald · 12=amber · 16=rose. This is the height palette schemes 21–28 reuse.",
    tone: (s) => heightTone(s),
  },
  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 🔢 PER-SIZE EXPLICIT MAPS                                            ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  {
    name: "11. Hand-picked palette (per size)",
    description:
      "Every one of the 12 known sizes gets its own distinct hue. Maximum recognition, no ordering.",
    tone: (s) => {
      const presets: Record<string, string> = {
        "14 x 7": "bg-teal-500/85 text-white",
        "16 x 6": "bg-cyan-500/85 text-white",
        "16 x 10": "bg-sky-500/85 text-white",
        "20 x 10": "bg-blue-500/85 text-white",
        "24 x 10": "bg-indigo-500/85 text-white",
        "20 x 12": "bg-violet-500/85 text-white",
        "24 x 12": "bg-purple-600/85 text-white",
        "28 x 12": "bg-fuchsia-500/85 text-white",
        "28 x 16": "bg-pink-600/85 text-white",
        "32 x 16": "bg-rose-600/85 text-white",
        "36 x 16": "bg-orange-500/85 text-white",
        "40 x 16": "bg-amber-600/85 text-white",
      };
      const cls = presets[s];
      if (!cls) return STANDARD_BLUE;
      return { className: `${cls} border-transparent` };
    },
  },
  {
    name: "12. Hash → hue (deterministic fingerprint)",
    description:
      "Each known size maps to its own hue via a hash. Custom stays blue.",
    tone: (s) => {
      if (!isKnown(s)) return STANDARD_BLUE;
      let h = 0;
      for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
      const hue = h % 360;
      return {
        className: "border-transparent text-white",
        style: { backgroundColor: `hsl(${hue} 65% 45%)` },
      };
    },
  },
  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 🎀 STYLE VARIATIONS (square-count signal, different presentations)   ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  {
    name: "13. Outlined (border + text only)",
    description: "Transparent fill, colored border + matching text. Quietest option.",
    tone: (s) => {
      if (!isKnown(s)) return STANDARD_BLUE;
      const idx = tierIndex(s);
      const palettes = [
        "border-slate-400 text-slate-600",
        "border-sky-500 text-sky-600",
        "border-emerald-500 text-emerald-600",
        "border-amber-500 text-amber-600",
        "border-rose-500 text-rose-600",
      ];
      return { className: `${palettes[idx]!} bg-transparent border` };
    },
  },
  {
    name: "14. Soft tinted (light bg, colored text)",
    description: "Light tinted background with colored text — readable, low-key.",
    tone: (s) => {
      if (!isKnown(s)) return STANDARD_BLUE;
      const idx = tierIndex(s);
      const palettes = [
        "bg-slate-100 text-slate-700 border-slate-200",
        "bg-sky-100 text-sky-700 border-sky-200",
        "bg-emerald-100 text-emerald-700 border-emerald-200",
        "bg-amber-100 text-amber-800 border-amber-200",
        "bg-rose-100 text-rose-700 border-rose-200",
      ];
      return { className: palettes[idx]! };
    },
  },
  {
    name: "15. Glass / translucent",
    description: "Semi-transparent fill with a subtle ring. Modern UI feel.",
    tone: (s) => {
      if (!isKnown(s)) return STANDARD_BLUE;
      const idx = tierIndex(s);
      const palettes = [
        "bg-slate-500/30 ring-slate-400/40 text-slate-800 dark:text-slate-100",
        "bg-sky-500/30 ring-sky-400/40 text-sky-900 dark:text-sky-100",
        "bg-emerald-500/30 ring-emerald-400/40 text-emerald-900 dark:text-emerald-100",
        "bg-amber-500/35 ring-amber-400/40 text-amber-900 dark:text-amber-100",
        "bg-rose-500/30 ring-rose-400/40 text-rose-900 dark:text-rose-100",
      ];
      return {
        className: `${palettes[idx]!} backdrop-blur-sm ring-1 border-transparent`,
      };
    },
  },
  {
    name: "16. Left-bar accent",
    description:
      "Neutral pill body with a colored left bar. Looks like a status indicator.",
    tone: (s) => {
      if (!isKnown(s)) return STANDARD_BLUE;
      const idx = tierIndex(s);
      const bars = [
        "before:bg-slate-500",
        "before:bg-sky-500",
        "before:bg-emerald-500",
        "before:bg-amber-500",
        "before:bg-rose-500",
      ];
      return {
        className: `bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700 relative pl-4 ${bars[idx]!} before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1.5 before:rounded-l-[10px]`,
      };
    },
  },
  {
    name: "17. Dot prefix",
    description: "Neutral pill, colored circle dot before the text.",
    tone: (s) => {
      if (!isKnown(s)) return STANDARD_BLUE;
      const idx = tierIndex(s);
      const dots = [
        "before:bg-slate-500",
        "before:bg-sky-500",
        "before:bg-emerald-500",
        "before:bg-amber-500",
        "before:bg-rose-500",
      ];
      return {
        className: `bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700 gap-1.5 ${dots[idx]!} before:content-[''] before:inline-block before:h-2 before:w-2 before:rounded-full`,
      };
    },
  },
  {
    name: "18. Gradient pill (hue intensifies with size)",
    description:
      "Background is a left→right gradient that gets richer as the size goes up.",
    tone: (s) => {
      if (!isKnown(s)) return STANDARD_BLUE;
      const idx = tierIndex(s);
      const grads = [
        "bg-gradient-to-r from-slate-300 to-slate-500 text-white",
        "bg-gradient-to-r from-sky-300 to-sky-600 text-white",
        "bg-gradient-to-r from-emerald-300 to-emerald-700 text-white",
        "bg-gradient-to-r from-amber-300 to-amber-700 text-white",
        "bg-gradient-to-r from-rose-300 to-rose-700 text-white",
      ];
      return { className: `${grads[idx]!} border-transparent` };
    },
  },
  {
    name: "19. Two-tone split (width hue / height shade)",
    description:
      "Top encodes width band, bottom encodes height band. Dense info but a bit busy.",
    tone: (s) => {
      if (!isKnown(s)) return STANDARD_BLUE;
      const p = parse(s);
      if (!p) return STANDARD_BLUE;
      const widthHue =
        p.w <= 16
          ? "from-sky-500"
          : p.w <= 24
            ? "from-violet-500"
            : "from-rose-500";
      const heightHue =
        p.h <= 7
          ? "to-emerald-400"
          : p.h <= 12
            ? "to-amber-500"
            : "to-red-600";
      return {
        className: `bg-gradient-to-b ${widthHue} ${heightHue} text-white border-transparent`,
      };
    },
  },
  {
    name: "20. Continuous HSL ramp (smooth, square count)",
    description:
      "No buckets — hue interpolates smoothly across the full range of known sizes.",
    tone: (s) => {
      if (!isKnown(s)) return STANDARD_BLUE;
      const p = parse(s);
      if (!p) return STANDARD_BLUE;
      // Known-size square range: 96 → 640.
      const t = Math.max(0, Math.min(1, (p.sq - 96) / (640 - 96)));
      const hue = 220 - t * 220; // blue → red
      return {
        className: "border-transparent text-white",
        style: { backgroundColor: `hsl(${hue} 60% 45%)` },
      };
    },
  },
  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 📐 VISUAL SIZE SCHEMES — color by HEIGHT, shape conveys SIZE          ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  {
    name: "21. Aspect-ratio mini-frame inside the pill",
    description:
      "A tiny outlined rectangle inside the pill matches the actual width:height ratio. Color = height.",
    tone: (s) => {
      const base = heightTone(s);
      if (base === STANDARD_BLUE) return STANDARD_BLUE;
      const p = parse(s)!;
      const fh = 12;
      const fw = Math.round(fh * (p.w / p.h));
      return {
        ...base,
        className: `${base.className} gap-2`,
        prefix: (
          <span
            className="inline-block border border-white/80 rounded-[2px] flex-shrink-0"
            style={{ width: `${fw}px`, height: `${fh}px` }}
          />
        ),
      };
    },
  },
  {
    name: "22. Pill width scales with actual width",
    description:
      "The pill itself physically widens with the size's width. Color = height.",
    tone: (s) => {
      const base = heightTone(s);
      if (base === STANDARD_BLUE) return STANDARD_BLUE;
      const p = parse(s)!;
      return {
        ...base,
        style: { ...base.style, minWidth: `${48 + p.w * 2.4}px` },
      };
    },
  },
  {
    name: "23. Both axes scaled — pill is a tiny model of the size",
    description:
      "Pill width AND height scale to mirror the actual proportions. Color = height.",
    tone: (s) => {
      const base = heightTone(s);
      if (base === STANDARD_BLUE) return STANDARD_BLUE;
      const p = parse(s)!;
      return {
        ...base,
        style: {
          ...base.style,
          minWidth: `${44 + p.w * 2.2}px`,
          height: `${14 + p.h * 0.7}px`,
        },
      };
    },
  },
  {
    name: "24. Battery-fill (square count as a percentage)",
    description:
      "Background is left-to-right gradient: filled portion = sq / max sq. Fill color = height.",
    tone: (s) => {
      const hex = heightHex(s);
      if (!hex) return STANDARD_BLUE;
      const p = parse(s)!;
      const pct = Math.round((p.sq / 640) * 100);
      return {
        className:
          "text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700",
        style: {
          background: `linear-gradient(to right, ${hex} ${pct}%, rgb(229 231 235) ${pct}%)`,
        },
      };
    },
  },
  {
    name: "25. Tile-grid prefix",
    description:
      "Mini grid of dots sized roughly like the tile pattern (cols≈w/8, rows≈h/4). Color = height.",
    tone: (s) => {
      const base = heightTone(s);
      if (base === STANDARD_BLUE) return STANDARD_BLUE;
      const p = parse(s)!;
      const cols = Math.max(2, Math.round(p.w / 8));
      const rows = Math.max(1, Math.round(p.h / 4));
      const dots: ReactNode[] = [];
      for (let i = 0; i < rows * cols; i++) {
        dots.push(
          <span
            key={i}
            className="block bg-white rounded-full"
            style={{ width: "2px", height: "2px" }}
          />
        );
      }
      return {
        ...base,
        className: `${base.className} gap-2`,
        prefix: (
          <span
            className="inline-grid"
            style={{
              gridTemplateColumns: `repeat(${cols}, 2px)`,
              gridAutoRows: "2px",
              gap: "1px",
            }}
          >
            {dots}
          </span>
        ),
      };
    },
  },
  {
    name: "26. Height-rank dots",
    description:
      "1–4 dots before the text indicate which of the four height tiers it is (6/7→1, 10→2, 12→3, 16→4).",
    tone: (s) => {
      const base = heightTone(s);
      if (base === STANDARD_BLUE) return STANDARD_BLUE;
      const p = parse(s)!;
      const rank: Record<number, number> = { 6: 1, 7: 1, 10: 2, 12: 3, 16: 4 };
      const filled = rank[p.h] ?? 0;
      const dots: ReactNode[] = [];
      for (let i = 0; i < 4; i++) {
        dots.push(
          <span
            key={i}
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              i < filled ? "bg-white" : "bg-white/30"
            }`}
          />
        );
      }
      return {
        ...base,
        className: `${base.className} gap-1.5`,
        prefix: <span className="inline-flex gap-0.5">{dots}</span>,
      };
    },
  },
  {
    name: "27. Aspect mini-block prefix (filled rectangle)",
    description:
      "A tiny filled rectangle prefix has the actual w:h ratio of the size. Color = height.",
    tone: (s) => {
      const hex = heightHex(s);
      if (!hex) return STANDARD_BLUE;
      const p = parse(s)!;
      const bh = 10;
      const bw = Math.min(22, Math.round(bh * (p.w / p.h)));
      return {
        className:
          "bg-slate-700 dark:bg-slate-800 text-white border-transparent gap-2",
        prefix: (
          <span
            className="inline-block rounded-[2px] flex-shrink-0"
            style={{ width: `${bw}px`, height: `${bh}px`, backgroundColor: hex }}
          />
        ),
      };
    },
  },
  {
    name: "28. Stacked width/height micro-bars",
    description:
      "Two stacked bars before the text — top = width / max-width, bottom = height / max-height. Pill color = height.",
    tone: (s) => {
      const base = heightTone(s);
      if (base === STANDARD_BLUE) return STANDARD_BLUE;
      const p = parse(s)!;
      const wPx = Math.round((p.w / 40) * 22);
      const hPx = Math.round((p.h / 16) * 22);
      return {
        ...base,
        className: `${base.className} gap-2`,
        prefix: (
          <span className="inline-flex flex-col gap-[2px] justify-center">
            <span
              className="block bg-white rounded-full"
              style={{ width: `${wPx}px`, height: "3px" }}
            />
            <span
              className="block bg-white/70 rounded-full"
              style={{ width: `${hPx}px`, height: "3px" }}
            />
          </span>
        ),
      };
    },
  },
];

function SizePill({ size, tone }: { size: string; tone: Tone }) {
  return (
    <span className={`${PILL_GEOM} ${tone.className ?? ""}`} style={tone.style}>
      {tone.prefix}
      {size}
    </span>
  );
}

export default function SizeColorPreviewPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 lg:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Size Pill Color Schemes
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            28 schemes applied to the 12 sizes from{" "}
            <code className="font-mono">ItemSizes</code> plus a "Custom" badge.
            Anything outside the official list always falls back to the
            standard blue badge. Schemes 21–28 add visual size cues (mini
            frames, scaled pills, tile grids, micro-bars) on top of the
            per-height color palette from scheme 10.
          </p>
        </header>

        <div className="space-y-4">
          {SCHEMES.map((scheme) => (
            <section
              key={scheme.name}
              className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm"
            >
              <div className="mb-3 space-y-0.5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {scheme.name}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {scheme.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_SIZES.map((size) => (
                  <SizePill key={size} size={size} tone={scheme.tone(size)} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="pt-4 pb-8 text-xs text-gray-500 dark:text-gray-400">
          Tell me the number you like and I'll replace the static
          <code className="mx-1 font-mono">SIZE_TONE</code> in
          <code className="mx-1 font-mono">components/ui/order-pills.tsx</code>
          with the chosen scheme.
        </footer>
      </div>
    </div>
  );
}
