"use client";

import type { ReactNode } from "react";

const TWO_PI = Math.PI * 2;
const CENTER = 32;

const teethPoints = (n: number, R: number, r: number, phase = 0): string => {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TWO_PI - Math.PI / 2 + phase;
    const radius = i % 2 === 0 ? R : r;
    pts.push(
      `${(CENTER + radius * Math.cos(a)).toFixed(2)},${(CENTER + radius * Math.sin(a)).toFixed(2)}`
    );
  }
  return pts.join(" ");
};

const skewTeethPoints = (n: number, R: number, r: number, skew: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const aValley = (i / n) * TWO_PI - Math.PI / 2;
    const aTip = aValley + Math.PI / n - skew;
    pts.push(
      `${(CENTER + r * Math.cos(aValley)).toFixed(2)},${(CENTER + r * Math.sin(aValley)).toFixed(2)}`
    );
    pts.push(
      `${(CENTER + R * Math.cos(aTip)).toFixed(2)},${(CENTER + R * Math.sin(aTip)).toFixed(2)}`
    );
  }
  return pts.join(" ");
};

const gearPoints = (n: number, R: number, r: number, duty = 0.55): string => {
  const pts: string[] = [];
  const slice = TWO_PI / n;
  for (let i = 0; i < n; i++) {
    const aStart = (i / n) * TWO_PI - Math.PI / 2;
    const aRise = aStart + (slice * (1 - duty)) / 2;
    const aFall = aStart + (slice * (1 + duty)) / 2;
    pts.push(
      `${(CENTER + r * Math.cos(aStart)).toFixed(2)},${(CENTER + r * Math.sin(aStart)).toFixed(2)}`
    );
    pts.push(
      `${(CENTER + r * Math.cos(aRise)).toFixed(2)},${(CENTER + r * Math.sin(aRise)).toFixed(2)}`
    );
    pts.push(
      `${(CENTER + R * Math.cos(aRise)).toFixed(2)},${(CENTER + R * Math.sin(aRise)).toFixed(2)}`
    );
    pts.push(
      `${(CENTER + R * Math.cos(aFall)).toFixed(2)},${(CENTER + R * Math.sin(aFall)).toFixed(2)}`
    );
    pts.push(
      `${(CENTER + r * Math.cos(aFall)).toFixed(2)},${(CENTER + r * Math.sin(aFall)).toFixed(2)}`
    );
  }
  return pts.join(" ");
};

const asymStarPoints = (n: number, Rlong: number, Rshort: number, r: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * TWO_PI - Math.PI / 2;
    const radius =
      i % 2 === 0 ? ((i / 2) % 2 === 0 ? Rlong : Rshort) : r;
    pts.push(
      `${(CENTER + radius * Math.cos(a)).toFixed(2)},${(CENTER + radius * Math.sin(a)).toFixed(2)}`
    );
  }
  return pts.join(" ");
};

const hexPoints = (radius: number): string =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * TWO_PI - Math.PI / 2;
    return `${(CENTER + radius * Math.cos(a)).toFixed(2)},${(CENTER + radius * Math.sin(a)).toFixed(2)}`;
  }).join(" ");

type Blade = { name: string; render: (id: string) => ReactNode };

const BLADES: Blade[] = [
  {
    name: "Classic 12",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(12, 30, 22)} />
        <circle className="blade" cx="32" cy="32" r="5" />
      </>
    ),
  },
  {
    name: "Chunky 8",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(8, 30, 18)} />
        <circle className="blade" cx="32" cy="32" r="5" />
      </>
    ),
  },
  {
    name: "Fine 24",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(24, 30, 26)} />
        <circle className="blade" cx="32" cy="32" r="4" />
      </>
    ),
  },
  {
    name: "Sun-Ray 16",
    render: () => (
      <>
        {Array.from({ length: 16 }).map((_, i) => {
          const a = (i / 16) * TWO_PI;
          const x1 = (CENTER + 11 * Math.cos(a)).toFixed(2);
          const y1 = (CENTER + 11 * Math.sin(a)).toFixed(2);
          const x2 = (CENTER + 30 * Math.cos(a)).toFixed(2);
          const y2 = (CENTER + 30 * Math.sin(a)).toFixed(2);
          return <line key={i} className="blade" x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
        <circle className="blade" cx="32" cy="32" r="11" />
        <circle className="blade" cx="32" cy="32" r="3" />
      </>
    ),
  },
  {
    name: "Star 6",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(6, 30, 12)} />
        <circle className="blade" cx="32" cy="32" r="4" />
      </>
    ),
  },
  {
    name: "Aggressive 10",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(10, 30, 17)} />
        <circle className="blade" cx="32" cy="32" r="5" />
      </>
    ),
  },
  {
    name: "Concentric 12",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(12, 30, 24)} />
        <polygon className="blade" points={teethPoints(8, 18, 13)} />
        <circle className="blade" cx="32" cy="32" r="3" />
      </>
    ),
  },
  {
    name: "Gear 12",
    render: () => (
      <>
        <polygon className="blade" points={gearPoints(12, 30, 23)} />
        <circle className="blade" cx="32" cy="32" r="5" />
      </>
    ),
  },
  {
    name: "Diamond-Tip 14",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(14, 28, 22)} />
        {Array.from({ length: 14 }).map((_, i) => {
          const a = (i / 14) * TWO_PI - Math.PI / 2;
          const cx = (CENTER + 28 * Math.cos(a)).toFixed(2);
          const cy = (CENTER + 28 * Math.sin(a)).toFixed(2);
          return <circle key={i} className="blade" cx={cx} cy={cy} r="1.6" />;
        })}
        <circle className="blade" cx="32" cy="32" r="4" />
      </>
    ),
  },
  {
    name: "Filled Disc",
    render: () => (
      <>
        <polygon className="blade-fill" points={teethPoints(12, 30, 22)} />
        <circle className="blade-bg" cx="32" cy="32" r="5" />
      </>
    ),
  },
  {
    name: "Hex Arbor",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(12, 30, 22)} />
        <polygon className="blade" points={hexPoints(6)} />
      </>
    ),
  },
  {
    name: "Cross Arbor",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(12, 30, 22)} />
        <circle className="blade" cx="32" cy="32" r="7" />
        <line className="blade" x1="25" y1="32" x2="39" y2="32" />
        <line className="blade" x1="32" y1="25" x2="32" y2="39" />
      </>
    ),
  },
  {
    name: "Sharp 14",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(14, 30, 18)} />
        <circle className="blade" cx="32" cy="32" r="4" />
      </>
    ),
  },
  {
    name: "Double Disc",
    render: () => (
      <>
        <g transform="translate(-7 0)">
          <polygon className="blade" points={teethPoints(10, 22, 16)} />
        </g>
        <g transform="translate(7 0)">
          <polygon className="blade" points={teethPoints(10, 22, 16)} />
        </g>
      </>
    ),
  },
  {
    name: "Half Blade",
    render: (id) => (
      <>
        <defs>
          <clipPath id={`half-${id}`}>
            <rect x="0" y="0" width="64" height="34" />
          </clipPath>
        </defs>
        <g clipPath={`url(#half-${id})`}>
          <polygon className="blade" points={teethPoints(12, 30, 22)} />
          <circle className="blade" cx="32" cy="32" r="5" />
        </g>
        <line className="blade" x1="2" y1="34" x2="62" y2="34" />
      </>
    ),
  },
  {
    name: "Skew 14",
    render: () => (
      <>
        <polygon className="blade" points={skewTeethPoints(14, 30, 22, 0.2)} />
        <circle className="blade" cx="32" cy="32" r="5" />
      </>
    ),
  },
  {
    name: "Bolt Center",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(12, 30, 22)} />
        <rect className="blade" x="26" y="26" width="12" height="12" rx="1.5" />
        <line className="blade" x1="32" y1="26" x2="32" y2="38" />
      </>
    ),
  },
  {
    name: "Mini 20",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(20, 30, 27)} />
        <circle className="blade" cx="32" cy="32" r="4" />
      </>
    ),
  },
  {
    name: "Asym Star 8",
    render: () => (
      <>
        <polygon className="blade" points={asymStarPoints(8, 30, 23, 14)} />
        <circle className="blade" cx="32" cy="32" r="4" />
      </>
    ),
  },
  {
    name: "Triple Spoke",
    render: () => (
      <>
        <polygon className="blade" points={teethPoints(12, 30, 22)} />
        <circle className="blade" cx="32" cy="32" r="13" />
        {Array.from({ length: 3 }).map((_, i) => {
          const a = (i / 3) * TWO_PI - Math.PI / 2;
          const x = (CENTER + 13 * Math.cos(a)).toFixed(2);
          const y = (CENTER + 13 * Math.sin(a)).toFixed(2);
          return (
            <line key={i} className="blade" x1="32" y1="32" x2={x} y2={y} />
          );
        })}
        <circle className="blade" cx="32" cy="32" r="3" />
      </>
    ),
  },
];

const halfBlade = (
  id: string,
  cy: number,
  base: ReactNode,
  cutLine: ReactNode
): ReactNode => (
  <>
    <defs>
      <clipPath id={`clip-${id}`}>
        <rect x="0" y="0" width="64" height={cy} />
      </clipPath>
    </defs>
    <g clipPath={`url(#clip-${id})`}>{base}</g>
    {cutLine}
  </>
);

const classicBase = (
  <>
    <polygon className="blade" points={teethPoints(12, 30, 22)} />
    <circle className="blade" cx="32" cy="32" r="5" />
  </>
);

const HALF_VARIANTS: Blade[] = [
  {
    name: "15a · Standard",
    render: (id) =>
      halfBlade(
        id,
        34,
        classicBase,
        <line className="blade" x1="2" y1="34" x2="62" y2="34" />
      ),
  },
  {
    name: "15b · Shallow",
    render: (id) =>
      halfBlade(
        id,
        44,
        classicBase,
        <line className="blade" x1="2" y1="44" x2="62" y2="44" />
      ),
  },
  {
    name: "15c · Deep",
    render: (id) =>
      halfBlade(
        id,
        24,
        classicBase,
        <line className="blade" x1="2" y1="24" x2="62" y2="24" />
      ),
  },
  {
    name: "15d · Just Teeth",
    render: (id) =>
      halfBlade(
        id,
        14,
        classicBase,
        <line className="blade" x1="2" y1="14" x2="62" y2="14" />
      ),
  },
  {
    name: "15e · Diagonal",
    render: (id) => (
      <>
        <defs>
          <clipPath id={`clip-${id}`}>
            <polygon points="0,0 64,0 64,28 0,40" />
          </clipPath>
        </defs>
        <g clipPath={`url(#clip-${id})`}>{classicBase}</g>
        <line className="blade" x1="0" y1="40" x2="64" y2="28" />
      </>
    ),
  },
  {
    name: "15f · Plank",
    render: (id) => (
      <>
        <defs>
          <clipPath id={`clip-${id}`}>
            <rect x="0" y="0" width="64" height="36" />
          </clipPath>
        </defs>
        <g clipPath={`url(#clip-${id})`}>{classicBase}</g>
        <rect className="blade" x="4" y="36" width="56" height="14" rx="1.5" />
      </>
    ),
  },
  {
    name: "15g · Vertical Cut",
    render: (id) => (
      <>
        <defs>
          <clipPath id={`clip-${id}`}>
            <rect x="0" y="0" width="34" height="64" />
          </clipPath>
        </defs>
        <g clipPath={`url(#clip-${id})`}>{classicBase}</g>
        <line className="blade" x1="34" y1="2" x2="34" y2="62" />
      </>
    ),
  },
  {
    name: "15h · With Sawdust",
    render: (id) => (
      <>
        <defs>
          <clipPath id={`clip-${id}`}>
            <rect x="0" y="0" width="64" height="34" />
          </clipPath>
        </defs>
        <g clipPath={`url(#clip-${id})`}>{classicBase}</g>
        <line className="blade" x1="2" y1="34" x2="62" y2="34" />
        <circle className="blade" cx="10" cy="42" r="1.5" />
        <circle className="blade" cx="18" cy="48" r="1.5" />
        <circle className="blade" cx="50" cy="44" r="1.5" />
        <circle className="blade" cx="56" cy="50" r="1.5" />
      </>
    ),
  },
];

const skewBase = (skew: number, n = 14, R = 30, r = 22): ReactNode => (
  <>
    <polygon className="blade" points={skewTeethPoints(n, R, r, skew)} />
    <circle className="blade" cx="32" cy="32" r="5" />
  </>
);

const SKEW_VARIANTS: Blade[] = [
  {
    name: "16a · Light skew",
    render: () => skewBase(0.1),
  },
  {
    name: "16b · Medium",
    render: () => skewBase(0.2),
  },
  {
    name: "16c · Heavy",
    render: () => skewBase(0.32),
  },
  {
    name: "16d · Reverse",
    render: () => skewBase(-0.22),
  },
  {
    name: "16e · Skew 10",
    render: () => skewBase(0.22, 10),
  },
  {
    name: "16f · Skew 20",
    render: () => skewBase(0.18, 20, 30, 26),
  },
  {
    name: "16g · Deep gullet",
    render: () => skewBase(0.22, 14, 30, 17),
  },
  {
    name: "16h · Skew + hex",
    render: () => (
      <>
        <polygon className="blade" points={skewTeethPoints(14, 30, 22, 0.22)} />
        <polygon className="blade" points={hexPoints(6)} />
      </>
    ),
  },
];

const OPEN_BLADE_PATH =
  "M61.22,25.20 L49.20,18.28 L55.37,13.19 L41.55,12.18 L44.90,4.91 L32.00,10.00 L31.87,2.00 L22.45,12.18 L18.86,5.03 L14.80,18.28 L8.46,13.40 L10.55,27.10 L2.72,25.45 L10.55,36.90 L2.78,38.80 L14.80,45.72 L8.63,50.81 L22.45,51.82 L19.10,59.09 L32.00,54.00 L32,51 L36,44 L40,51 L43,44 L47,51 L51,44 L54,51 L58,44 L62,51 L62,54 L32,54";

const colorOutline = (stroke: string): ReactNode => (
  <>
    <path
      d={OPEN_BLADE_PATH}
      fill="none"
      stroke={stroke}
      strokeWidth="3.5"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
    <path
      d="M40,22 L25,22 L25,42 L40,42 M25,32 L36,32"
      fill="none"
      stroke={stroke}
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </>
);

const COLOR_BLADES: Blade[] = [
  {
    name: "Coral",
    render: () => colorOutline("#da7756"),
  },
  {
    name: "Burnt Orange",
    render: () => colorOutline("#ea580c"),
  },
  {
    name: "Amber",
    render: () => colorOutline("#d97706"),
  },
  {
    name: "Crimson",
    render: () => colorOutline("#dc2626"),
  },
  {
    name: "Forest",
    render: () => colorOutline("#15803d"),
  },
  {
    name: "Teal",
    render: () => colorOutline("#0d9488"),
  },
  {
    name: "Royal Blue",
    render: () => colorOutline("#2563eb"),
  },
  {
    name: "Indigo",
    render: () => colorOutline("#4f46e5"),
  },
  {
    name: "Violet",
    render: () => colorOutline("#7c3aed"),
  },
  {
    name: "Magenta",
    render: () => colorOutline("#db2777"),
  },
  {
    name: "Rainbow Stroke",
    render: (id) => (
      <>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="25%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="75%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <path
          d={OPEN_BLADE_PATH}
          fill="none"
          stroke={`url(#grad-${id})`}
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M40,22 L25,22 L25,42 L40,42 M25,32 L36,32"
          fill="none"
          stroke={`url(#grad-${id})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
  {
    name: "Sunset Stroke",
    render: (id) => (
      <>
        <defs>
          <linearGradient id={`grad-${id}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <path
          d={OPEN_BLADE_PATH}
          fill="none"
          stroke={`url(#grad-${id})`}
          strokeWidth="3.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M40,22 L25,22 L25,42 L40,42 M25,32 L36,32"
          fill="none"
          stroke={`url(#grad-${id})`}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  },
];

const BLADE_STYLE = `
  .blade { stroke: #0f172a; fill: none; stroke-width: 3.5; stroke-linejoin: round; stroke-linecap: round; }
  .blade-fill { fill: #0f172a; stroke: none; }
  .blade-bg { fill: #f9fafb; stroke: #0f172a; stroke-width: 1.5; }
  @media (prefers-color-scheme: dark) {
    .blade { stroke: #ffffff; }
    .blade-fill { fill: #ffffff; }
    .blade-bg { fill: #030712; stroke: #ffffff; }
  }
`;

function Section({
  title,
  blades,
  prefix,
  numbered,
}: {
  title: string;
  blades: Blade[];
  prefix: string;
  numbered?: boolean;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {blades.map((b, i) => (
          <div
            key={b.name}
            className="flex flex-col items-center justify-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
          >
            <svg viewBox="0 0 64 64" className="h-20 w-20">
              {b.render(`${prefix}-big-${i}`)}
            </svg>
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 64 64" className="h-4 w-4">
                {b.render(`${prefix}-xs-${i}`)}
              </svg>
              <svg viewBox="0 0 64 64" className="h-6 w-6">
                {b.render(`${prefix}-sm-${i}`)}
              </svg>
            </div>
            <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 text-center">
              {numbered ? `#${i + 1} · ` : ""}
              {b.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function IconsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <style dangerouslySetInnerHTML={{ __html: BLADE_STYLE }} />
      <div className="max-w-6xl mx-auto space-y-12">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Favicon — Saw Blade Candidates
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Pick one to replace <code className="text-xs">app/icon.svg</code>.
          </p>
        </div>

        <Section
          title="Colorful candidates"
          blades={COLOR_BLADES}
          prefix="color"
        />

        <Section
          title="Variations of #15 — Half Blade (cutting through)"
          blades={HALF_VARIANTS}
          prefix="half"
        />

        <Section
          title="Variations of #16 — Skew teeth (rake angle)"
          blades={SKEW_VARIANTS}
          prefix="skew"
        />

        <Section
          title="Original 20 candidates"
          blades={BLADES}
          prefix="all"
          numbered
        />
      </div>
    </div>
  );
}
