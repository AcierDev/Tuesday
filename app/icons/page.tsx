"use client";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📁 ICON GALLERY — FILING CABINET / ENVELOPE VARIANTS                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Top-down views of a filing cabinet drawer with envelopes/folders.
// Each card shows one icon variant for use in the orders status sidebar.

const ICON_SIZE = 64;

type IconProps = { size?: number; className?: string };

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✉️ VARIANT 1 — STACKED ENVELOPES IN DRAWER                          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
function CabinetStacked({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* drawer outline */}
      <rect x="6" y="8" width="52" height="48" rx="3" />
      {/* envelopes (rows) */}
      <rect x="11" y="14" width="42" height="9" rx="1" />
      <rect x="11" y="26" width="42" height="9" rx="1" />
      <rect x="11" y="38" width="42" height="9" rx="1" />
      {/* envelope flap lines */}
      <path d="M11 14l21 5 21-5" />
      <path d="M11 26l21 5 21-5" />
      <path d="M11 38l21 5 21-5" />
    </svg>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✉️ VARIANT 2 — DRAWER WITH FILE TABS                                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
function CabinetTabs({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="6" y="10" width="52" height="46" rx="3" />
      {/* file tabs sticking up from each envelope */}
      <path d="M14 10v-4h8v4" />
      <path d="M28 10v-4h8v4" />
      <path d="M42 10v-4h8v4" />
      {/* envelope bodies */}
      <rect x="11" y="14" width="42" height="11" rx="1" />
      <rect x="11" y="28" width="42" height="11" rx="1" />
      <rect x="11" y="42" width="42" height="11" rx="1" />
    </svg>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✉️ VARIANT 3 — OPEN DRAWER, ONE ENVELOPE LIFTED                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
function CabinetLifted({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="6" y="14" width="52" height="44" rx="3" />
      <rect x="11" y="20" width="42" height="8" rx="1" />
      <rect x="11" y="42" width="42" height="8" rx="1" />
      {/* lifted envelope (offset + shadow line) */}
      <rect
        x="14"
        y="30"
        width="42"
        height="9"
        rx="1"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path d="M14 30l21 5 21-5" />
    </svg>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✉️ VARIANT 4 — DENSE STACK (MANY ENVELOPES)                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
function CabinetDense({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="6" y="8" width="52" height="48" rx="3" />
      {Array.from({ length: 5 }).map((_, i) => (
        <rect
          key={i}
          x="11"
          y={13 + i * 8}
          width="42"
          height="6"
          rx="1"
        />
      ))}
    </svg>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✉️ VARIANT 5 — DRAWER WITH RAIL HANDLE                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
function CabinetRail({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* outer drawer with side rails */}
      <rect x="4" y="10" width="56" height="44" rx="2" />
      <line x1="10" y1="10" x2="10" y2="54" />
      <line x1="54" y1="10" x2="54" y2="54" />
      {/* envelopes */}
      <rect x="14" y="16" width="36" height="9" rx="1" />
      <rect x="14" y="28" width="36" height="9" rx="1" />
      <rect x="14" y="40" width="36" height="9" rx="1" />
      <path d="M14 16l18 5 18-5" />
      <path d="M14 28l18 5 18-5" />
      <path d="M14 40l18 5 18-5" />
    </svg>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✉️ VARIANT 6 — HANGING FOLDERS (HOOKED RIM)                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
function CabinetHanging({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="6" y="8" width="52" height="48" rx="3" />
      {/* hooks at top + bottom of each folder */}
      {[16, 28, 40].map((y) => (
        <g key={y}>
          <line x1="9" y1={y} x2="13" y2={y} />
          <line x1="51" y1={y} x2="55" y2={y} />
          <rect x="13" y={y - 3} width="38" height="9" rx="1" />
        </g>
      ))}
    </svg>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✉️ VARIANT 7 — ENVELOPES WITH SEAL DOTS                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
function CabinetSealed({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="6" y="8" width="52" height="48" rx="3" />
      {[14, 26, 38].map((y) => (
        <g key={y}>
          <rect x="11" y={y} width="42" height="9" rx="1" />
          <path d={`M11 ${y}l21 5 21-5`} />
          <circle cx="32" cy={y + 4.5} r="1.2" fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✉️ VARIANT 8 — STAGGERED (TABS LEFT/RIGHT/CENTER)                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
function CabinetStaggered({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="6" y="10" width="52" height="46" rx="3" />
      {/* staggered tabs */}
      <path d="M14 10v-4h10v4" />
      <path d="M28 10v-4h10v4" />
      <path d="M42 10v-4h10v4" />
      {/* envelope bodies */}
      <rect x="11" y="14" width="42" height="11" rx="1" />
      <rect x="11" y="28" width="42" height="11" rx="1" />
      <rect x="11" y="42" width="42" height="11" rx="1" />
      {/* flap diagonals */}
      <path d="M11 14l21 6 21-6" />
      <path d="M11 28l21 6 21-6" />
      <path d="M11 42l21 6 21-6" />
    </svg>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📦 DENSE STACK VARIATIONS                                           ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// All built off the original CabinetDense — same drawer, varying envelope
// count, spacing, accents, and orientation.

const DENSE_DRAWER_X = 6;
const DENSE_DRAWER_Y = 8;
const DENSE_DRAWER_W = 52;
const DENSE_DRAWER_H = 48;
const DENSE_INNER_X = 11;
const DENSE_INNER_W = 42;

//╔═══╗ Dense — 4 envelopes (roomy)
function CabinetDense4({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x={DENSE_DRAWER_X} y={DENSE_DRAWER_Y} width={DENSE_DRAWER_W} height={DENSE_DRAWER_H} rx="3" />
      {Array.from({ length: 4 }).map((_, i) => (
        <rect key={i} x={DENSE_INNER_X} y={14 + i * 10} width={DENSE_INNER_W} height="7" rx="1" />
      ))}
    </svg>
  );
}

//╔═══╗ Dense — 6 envelopes (tighter)
function CabinetDense6({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x={DENSE_DRAWER_X} y={DENSE_DRAWER_Y} width={DENSE_DRAWER_W} height={DENSE_DRAWER_H} rx="3" />
      {Array.from({ length: 6 }).map((_, i) => (
        <rect key={i} x={DENSE_INNER_X} y={13 + i * 6.5} width={DENSE_INNER_W} height="5" rx="1" />
      ))}
    </svg>
  );
}

//╔═══╗ Dense — 7 envelopes (very tight)
function CabinetDense7({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x={DENSE_DRAWER_X} y={DENSE_DRAWER_Y} width={DENSE_DRAWER_W} height={DENSE_DRAWER_H} rx="3" />
      {Array.from({ length: 7 }).map((_, i) => (
        <rect key={i} x={DENSE_INNER_X} y={12 + i * 5.6} width={DENSE_INNER_W} height="4" rx="0.8" />
      ))}
    </svg>
  );
}

//╔═══╗ Dense — with V-flaps on each envelope
function CabinetDenseFlaps({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x={DENSE_DRAWER_X} y={DENSE_DRAWER_Y} width={DENSE_DRAWER_W} height={DENSE_DRAWER_H} rx="3" />
      {Array.from({ length: 5 }).map((_, i) => {
        const y = 13 + i * 8;
        return (
          <g key={i}>
            <rect x={DENSE_INNER_X} y={y} width={DENSE_INNER_W} height="6" rx="1" />
            <path d={`M${DENSE_INNER_X} ${y}l21 3 21-3`} />
          </g>
        );
      })}
    </svg>
  );
}

//╔═══╗ Dense — with file tabs
function CabinetDenseTabs({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x={DENSE_DRAWER_X} y={DENSE_DRAWER_Y} width={DENSE_DRAWER_W} height={DENSE_DRAWER_H} rx="3" />
      {Array.from({ length: 5 }).map((_, i) => {
        const y = 13 + i * 8;
        const tabX = 14 + (i % 3) * 14;
        return (
          <g key={i}>
            <rect x={DENSE_INNER_X} y={y} width={DENSE_INNER_W} height="6" rx="1" />
            <line x1={tabX} y1={y} x2={tabX + 6} y2={y} strokeWidth="2" />
          </g>
        );
      })}
    </svg>
  );
}

//╔═══╗ Dense — one highlighted (active item)
function CabinetDenseActive({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x={DENSE_DRAWER_X} y={DENSE_DRAWER_Y} width={DENSE_DRAWER_W} height={DENSE_DRAWER_H} rx="3" />
      {Array.from({ length: 5 }).map((_, i) => {
        const y = 13 + i * 8;
        const highlight = i === 2;
        return (
          <rect
            key={i}
            x={DENSE_INNER_X}
            y={y}
            width={DENSE_INNER_W}
            height="6"
            rx="1"
            fill={highlight ? "currentColor" : "none"}
            fillOpacity={highlight ? 0.25 : 0}
          />
        );
      })}
    </svg>
  );
}

//╔═══╗ Dense — with rail handles on the sides
function CabinetDenseRails({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y={DENSE_DRAWER_Y} width="56" height={DENSE_DRAWER_H} rx="2" />
      <line x1="9" y1={DENSE_DRAWER_Y + 2} x2="9" y2={DENSE_DRAWER_Y + DENSE_DRAWER_H - 2} />
      <line x1="55" y1={DENSE_DRAWER_Y + 2} x2="55" y2={DENSE_DRAWER_Y + DENSE_DRAWER_H - 2} />
      {Array.from({ length: 5 }).map((_, i) => (
        <rect key={i} x="13" y={13 + i * 8} width="38" height="6" rx="1" />
      ))}
    </svg>
  );
}

//╔═══╗ Dense — vertical orientation (envelopes are columns)
function CabinetDenseVertical({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x={DENSE_DRAWER_X} y={DENSE_DRAWER_Y} width={DENSE_DRAWER_W} height={DENSE_DRAWER_H} rx="3" />
      {Array.from({ length: 5 }).map((_, i) => (
        <rect key={i} x={11 + i * 8} y="13" width="6" height="38" rx="1" />
      ))}
    </svg>
  );
}

//╔═══╗ Dense — varying widths (some envelopes are short)
function CabinetDenseVaried({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x={DENSE_DRAWER_X} y={DENSE_DRAWER_Y} width={DENSE_DRAWER_W} height={DENSE_DRAWER_H} rx="3" />
      {[42, 36, 42, 30, 42].map((w, i) => (
        <rect key={i} x={DENSE_INNER_X} y={13 + i * 8} width={w} height="6" rx="1" />
      ))}
    </svg>
  );
}

//╔═══╗ Dense — bold (thicker strokes for higher contrast)
function CabinetDenseBold({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x={DENSE_DRAWER_X} y={DENSE_DRAWER_Y} width={DENSE_DRAWER_W} height={DENSE_DRAWER_H} rx="3" />
      {Array.from({ length: 5 }).map((_, i) => (
        <rect key={i} x={DENSE_INNER_X} y={13 + i * 8} width={DENSE_INNER_W} height="6" rx="1" />
      ))}
    </svg>
  );
}

//╔═══╗ Dense — filled envelopes (solid, not outlined)
function CabinetDenseFilled({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x={DENSE_DRAWER_X} y={DENSE_DRAWER_Y} width={DENSE_DRAWER_W} height={DENSE_DRAWER_H} rx="3" />
      {Array.from({ length: 5 }).map((_, i) => (
        <rect key={i} x={DENSE_INNER_X} y={13 + i * 8} width={DENSE_INNER_W} height="6" rx="1" fill="currentColor" fillOpacity="0.6" stroke="none" />
      ))}
    </svg>
  );
}

//╔═══╗ Dense — 5 envelopes, no drawer border, larger to fill
function CabinetDenseNoBorder({ size = ICON_SIZE, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {Array.from({ length: 5 }).map((_, i) => (
        <rect key={i} x="4" y={8 + i * 10} width="56" height="8" rx="1.5" />
      ))}
    </svg>
  );
}

const DENSE_VARIANTS: { name: string; Icon: (p: IconProps) => JSX.Element }[] = [
  { name: "Dense 5 (no border)", Icon: CabinetDenseNoBorder },
  { name: "Dense (5, original)", Icon: CabinetDense },
  { name: "Dense 4 (roomy)", Icon: CabinetDense4 },
  { name: "Dense 6 (tighter)", Icon: CabinetDense6 },
  { name: "Dense 7 (very tight)", Icon: CabinetDense7 },
  { name: "Dense + V-flaps", Icon: CabinetDenseFlaps },
  { name: "Dense + Tabs", Icon: CabinetDenseTabs },
  { name: "Dense (1 active)", Icon: CabinetDenseActive },
  { name: "Dense + Rails", Icon: CabinetDenseRails },
  { name: "Dense Vertical", Icon: CabinetDenseVertical },
  { name: "Dense Varied widths", Icon: CabinetDenseVaried },
  { name: "Dense Bold", Icon: CabinetDenseBold },
  { name: "Dense Filled", Icon: CabinetDenseFilled },
];

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 COLORED PREVIEW — VARIANT 1 IN STATUS COLORS                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const STATUS_PREVIEW = [
  { label: "New", color: "text-blue-500" },
  { label: "Cutting", color: "text-amber-500" },
  { label: "Sewing", color: "text-purple-500" },
  { label: "Pack", color: "text-emerald-500" },
  { label: "Door", color: "text-rose-500" },
  { label: "Shipped", color: "text-slate-500" },
];

const VARIANTS: { name: string; Icon: (p: IconProps) => JSX.Element }[] = [
  { name: "Stacked Envelopes", Icon: CabinetStacked },
  { name: "File Tabs", Icon: CabinetTabs },
  { name: "Lifted Envelope", Icon: CabinetLifted },
  { name: "Dense Stack", Icon: CabinetDense },
  { name: "Rail Drawer", Icon: CabinetRail },
  { name: "Hanging Folders", Icon: CabinetHanging },
  { name: "Sealed Envelopes", Icon: CabinetSealed },
  { name: "Staggered Tabs", Icon: CabinetStaggered },
];

export default function IconsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Filing Cabinet Icon Variants
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
          Top-down views of a drawer with envelopes — for the orders status
          sidebar. Click a variant name to see it in your status colors below.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12">
          {VARIANTS.map(({ name, Icon }) => (
            <div
              key={name}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
            >
              <Icon size={64} className="text-gray-700 dark:text-gray-300" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {name}
              </span>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Dense Stack — variations
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-12">
          {DENSE_VARIANTS.map(({ name, Icon }) => (
            <div
              key={name}
              className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
            >
              <Icon size={64} className="text-gray-700 dark:text-gray-300" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400 text-center">
                {name}
              </span>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Preview at sidebar size (Stacked variant)
        </h2>
        <div className="flex flex-wrap gap-2">
          {STATUS_PREVIEW.map(({ label, color }) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center w-16 h-16 rounded-xl px-1 bg-white/70 dark:bg-gray-900/40 backdrop-blur-md border border-white/30 dark:border-white/10 shadow"
            >
              <CabinetStacked size={28} className={color} />
              <span className="mt-0.5 w-full truncate text-center text-[9px] font-medium uppercase tracking-wide opacity-80 text-gray-700 dark:text-gray-300">
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
