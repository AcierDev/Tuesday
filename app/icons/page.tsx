"use client";

import { useState } from "react";
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
  "M61.22,25.20 L49.20,18.28 L55.37,13.19 L41.55,12.18 L44.90,4.91 L32.00,10.00 L31.87,2.00 L22.45,12.18 L18.86,5.03 L14.80,18.28 L8.46,13.40 L10.55,27.10 L2.72,25.45 L10.55,36.90 L2.78,38.80 L14.80,45.72 L8.63,50.81 L22.45,51.82 L19.10,59.09 L32.00,54.00 L62.00,54.00";

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

const CORAL = "#da7756";
const CORAL_STROKE = 5;

const coralE = (color: string = CORAL, sw: number = CORAL_STROKE): ReactNode => (
  <path
    d="M40,22 L25,22 L25,42 L40,42 M25,32 L36,32"
    fill="none"
    stroke={color}
    strokeWidth={sw}
    strokeLinecap="round"
    strokeLinejoin="round"
  />
);

const coralStroke = (points: string): ReactNode => (
  <polygon
    points={points}
    fill="none"
    stroke={CORAL}
    strokeWidth={CORAL_STROKE}
    strokeLinejoin="round"
    strokeLinecap="round"
  />
);

const coralFilled = (points: string): ReactNode => (
  <polygon
    points={points}
    fill={CORAL}
    stroke={CORAL}
    strokeWidth={CORAL_STROKE}
    strokeLinejoin="round"
    strokeLinecap="round"
  />
);

const coralBlade = (shape: ReactNode, e: ReactNode = coralE()): ReactNode => (
  <>
    {shape}
    {e}
  </>
);

const CORAL_VARIANTS: Blade[] = [
  {
    name: "Original",
    render: () => (
      <>
        <path
          d={OPEN_BLADE_PATH}
          fill="none"
          stroke={CORAL}
          strokeWidth={CORAL_STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coralE()}
      </>
    ),
  },
  {
    name: "Filled blade",
    render: () => (
      <>
        <path
          d={OPEN_BLADE_PATH}
          fill={CORAL}
          stroke={CORAL}
          strokeWidth={CORAL_STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coralE("#ffffff")}
      </>
    ),
  },
  {
    name: "Closed disc",
    render: () => coralBlade(coralStroke(teethPoints(12, 30, 22))),
  },
  {
    name: "Closed disc, filled",
    render: () =>
      coralBlade(coralFilled(teethPoints(12, 30, 22)), coralE("#ffffff")),
  },
  {
    name: "Fine teeth",
    render: () => coralBlade(coralStroke(teethPoints(20, 30, 26))),
  },
  {
    name: "Chunky teeth",
    render: () => coralBlade(coralStroke(teethPoints(8, 30, 18))),
  },
  {
    name: "Aggressive 10",
    render: () => coralBlade(coralStroke(teethPoints(10, 30, 17))),
  },
  {
    name: "Skewed teeth",
    render: () =>
      coralBlade(coralStroke(skewTeethPoints(14, 30, 22, 0.22))),
  },
  {
    name: "Star teeth",
    render: () => coralBlade(coralStroke(teethPoints(6, 30, 12))),
  },
  {
    name: "Sun-ray",
    render: (id) =>
      coralBlade(
        <g key={id}>
          {Array.from({ length: 16 }).map((_, i) => {
            const a = (i / 16) * TWO_PI;
            const x1 = (CENTER + 13 * Math.cos(a)).toFixed(2);
            const y1 = (CENTER + 13 * Math.sin(a)).toFixed(2);
            const x2 = (CENTER + 30 * Math.cos(a)).toFixed(2);
            const y2 = (CENTER + 30 * Math.sin(a)).toFixed(2);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={CORAL}
                strokeWidth={CORAL_STROKE}
                strokeLinecap="round"
              />
            );
          })}
          <circle
            cx="32"
            cy="32"
            r="13"
            fill="none"
            stroke={CORAL}
            strokeWidth={CORAL_STROKE}
          />
        </g>
      ),
  },
  {
    name: "Hex arbor",
    render: () => (
      <>
        {coralStroke(teethPoints(12, 30, 22))}
        {coralStroke(hexPoints(8))}
        {coralE()}
      </>
    ),
  },
  {
    name: "Card",
    render: () => (
      <>
        <rect x="0" y="0" width="64" height="64" rx="10" fill={CORAL} />
        <path
          d={OPEN_BLADE_PATH}
          fill="none"
          stroke="#ffffff"
          strokeWidth={CORAL_STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coralE("#ffffff")}
      </>
    ),
  },
];

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

  @keyframes capPulse {
    0%, 100% { opacity: 0.35; transform: scaleY(1); }
    50% { opacity: 1; transform: scaleY(1.6); }
  }
  .cap-pulse { animation: capPulse 1.4s ease-in-out infinite; transform-origin: center; }

  @keyframes capStripeScroll { to { background-position: 16px 0; } }
  .cap-stripes {
    background-image: repeating-linear-gradient(
      -45deg,
      rgba(16,185,129,0.95) 0,
      rgba(16,185,129,0.95) 4px,
      rgba(59,130,246,0.95) 4px,
      rgba(59,130,246,0.95) 8px
    );
    background-size: 16px 100%;
    animation: capStripeScroll 1.2s linear infinite;
  }

  .cap-glow { filter: drop-shadow(0 0 4px rgba(16,185,129,0.85)); }

  /* fill-in animation variants — each runs once on mount with fill-mode forwards */
  @keyframes fillSlideRight {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  .fill-slide-right { animation: fillSlideRight 360ms cubic-bezier(0.22,1,0.36,1) both; transform-origin: left center; }

  @keyframes fillIris {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  .fill-iris { animation: fillIris 360ms cubic-bezier(0.22,1,0.36,1) both; transform-origin: center; }

  @keyframes fillDropTop {
    from { transform: translateY(-100%); }
    to   { transform: translateY(0); }
  }
  .fill-drop-top { animation: fillDropTop 320ms cubic-bezier(0.22,1,0.36,1) both; }

  @keyframes fillRiseBottom {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  .fill-rise-bottom { animation: fillRiseBottom 320ms cubic-bezier(0.22,1,0.36,1) both; }

  @keyframes fillPop {
    0%   { transform: scale(0); }
    65%  { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
  .fill-pop { animation: fillPop 380ms cubic-bezier(0.34,1.56,0.64,1) both; transform-origin: center; }

  @keyframes fillFadeScale {
    from { opacity: 0; transform: scale(0.7); }
    to   { opacity: 1; transform: scale(1); }
  }
  .fill-fade-scale { animation: fillFadeScale 320ms ease-out both; transform-origin: center; }

  @keyframes fillWipeGlow {
    from { transform: scaleX(0); }
    to   { transform: scaleX(1); }
  }
  .fill-wipe-glow { animation: fillWipeGlow 380ms cubic-bezier(0.22,1,0.36,1) both; transform-origin: left center; box-shadow: 2px 0 6px rgba(16,185,129,0.9); }

  @keyframes fillDiagonal {
    from { clip-path: polygon(0 0, 0 0, -10% 100%, -10% 100%); }
    to   { clip-path: polygon(0 0, 110% 0, 100% 100%, -10% 100%); }
  }
  .fill-diagonal { animation: fillDiagonal 380ms cubic-bezier(0.22,1,0.36,1) both; }

  @keyframes fillSpring {
    0%   { transform: scaleX(0); }
    60%  { transform: scaleX(1.08); }
    100% { transform: scaleX(1); }
  }
  .fill-spring { animation: fillSpring 480ms cubic-bezier(0.34,1.56,0.64,1) both; transform-origin: left center; }

  @keyframes fillBubble {
    0%   { transform: scale(0.2);                opacity: 0.4; border-radius: 50%; }
    35%  { transform: scaleX(1.05) scaleY(2.2);  opacity: 1;   border-radius: 40%; }
    65%  { transform: scaleX(1.0)  scaleY(1.35); opacity: 1;   border-radius: 30%; }
    85%  { transform: scaleX(1.0)  scaleY(0.92); border-radius: 8px; }
    100% { transform: scale(1);                  border-radius: 2px; }
  }
  .fill-bubble { animation: fillBubble 1120ms cubic-bezier(0.34,1.56,0.64,1) both; transform-origin: center; }

  /* Snake-eating: short slide-right per cell, paired with a per-cell delay to
     produce a wave traveling across the batch. */
  @keyframes fillSnake {
    0%   { transform: scaleX(0); opacity: 0.6; }
    100% { transform: scaleX(1); opacity: 1; }
  }
  .fill-snake { animation: fillSnake 220ms cubic-bezier(0.22,1,0.36,1) both; transform-origin: left center; }
`;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📊 CAPACITY BAR VARIANTS                                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

type CapVariant =
  | "original"
  | "soft-seam"
  | "pulse-edge"
  | "diagonal-stripe"
  | "notch-single"
  | "ghost-blue"
  | "battery"
  | "glow"
  | "inset";

const CAP_VARIANTS: { key: CapVariant; name: string; blurb: string }[] = [
  { key: "original", name: "Original", blurb: "current behavior — green overlays blue" },
  { key: "soft-seam", name: "Soft gradient seam", blurb: "green→blue blend at the boundary" },
  { key: "pulse-edge", name: "Pulsing leading edge", blurb: "thin glowing line at the seam" },
  { key: "diagonal-stripe", name: "Diagonal stripe zone", blurb: "in-progress band where they meet" },
  { key: "notch-single", name: "Notch marker", blurb: "single green bar, target shown as a notch" },
  { key: "ghost-blue", name: "Ghost-blue backdrop", blurb: "blue is faded, green is the hero" },
  { key: "battery", name: "Battery cells", blurb: "10 segments fill green over blue" },
  { key: "glow", name: "Glow on green", blurb: "green casts a soft emerald halo" },
  { key: "inset", name: "Inset green", blurb: "green sits inside a blue frame" },
];

const BAR_HEIGHT_PX = 6;

function CapBar({
  variant,
  glued,
  planned,
  max,
}: {
  variant: CapVariant;
  glued: number;
  planned: number;
  max: number;
}) {
  const gluedPct = Math.min(100, Math.max(0, (glued / max) * 100));
  const plannedPct = Math.min(100, Math.max(0, (planned / max) * 100));

  const shell =
    "relative w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden";
  const shellStyle = { height: BAR_HEIGHT_PX } as const;

  if (variant === "original") {
    return (
      <div className={shell} style={shellStyle}>
        <div
          className="absolute inset-y-0 left-0 bg-blue-400 dark:bg-blue-500"
          style={{ width: `${plannedPct}%` }}
        />
        {glued > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500"
            style={{ width: `${gluedPct}%` }}
          />
        )}
      </div>
    );
  }

  if (variant === "soft-seam") {
    return (
      <div className={shell} style={shellStyle}>
        <div
          className="absolute inset-y-0 left-0 bg-blue-400 dark:bg-blue-500"
          style={{ width: `${plannedPct}%` }}
        />
        {glued > 0 && (
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${gluedPct}%`,
              background:
                "linear-gradient(to right, rgb(16,185,129) 0%, rgb(16,185,129) calc(100% - 10px), rgba(16,185,129,0) 100%)",
            }}
          />
        )}
      </div>
    );
  }

  if (variant === "pulse-edge") {
    return (
      <div className={shell} style={shellStyle}>
        <div
          className="absolute inset-y-0 left-0 bg-blue-400 dark:bg-blue-500"
          style={{ width: `${plannedPct}%` }}
        />
        {glued > 0 && (
          <>
            <div
              className="absolute inset-y-0 left-0 bg-emerald-500"
              style={{ width: `${gluedPct}%` }}
            />
            {gluedPct < plannedPct && (
              <div
                className="cap-pulse absolute inset-y-0 bg-emerald-300"
                style={{
                  left: `calc(${gluedPct}% - 1px)`,
                  width: 2,
                }}
              />
            )}
          </>
        )}
      </div>
    );
  }

  if (variant === "diagonal-stripe") {
    const seamWidth = 14;
    return (
      <div className={shell} style={shellStyle}>
        <div
          className="absolute inset-y-0 left-0 bg-blue-400 dark:bg-blue-500"
          style={{ width: `${plannedPct}%` }}
        />
        {glued > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500"
            style={{ width: `calc(${gluedPct}% - ${seamWidth / 2}px)` }}
          />
        )}
        {glued > 0 && gluedPct < plannedPct && (
          <div
            className="cap-stripes absolute inset-y-0"
            style={{
              left: `calc(${gluedPct}% - ${seamWidth / 2}px)`,
              width: seamWidth,
            }}
          />
        )}
      </div>
    );
  }

  if (variant === "notch-single") {
    return (
      <div className={shell} style={shellStyle}>
        <div
          className="absolute inset-y-0 left-0 bg-emerald-500"
          style={{ width: `${gluedPct}%` }}
        />
        <div
          className="absolute inset-y-0 bg-blue-500 dark:bg-blue-300"
          style={{
            left: `calc(${plannedPct}% - 1px)`,
            width: 2,
          }}
        />
      </div>
    );
  }

  if (variant === "ghost-blue") {
    return (
      <div className={shell} style={shellStyle}>
        <div
          className="absolute inset-y-0 left-0 bg-blue-400/30 dark:bg-blue-500/30"
          style={{ width: `${plannedPct}%` }}
        />
        {glued > 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-emerald-500"
            style={{ width: `${gluedPct}%` }}
          />
        )}
      </div>
    );
  }

  if (variant === "battery") {
    const cellCount = 10;
    const gluedCells = Math.round((glued / max) * cellCount);
    const plannedCells = Math.round((planned / max) * cellCount);
    return (
      <div
        className="relative w-full flex gap-[2px] rounded-full overflow-hidden"
        style={shellStyle}
      >
        {Array.from({ length: cellCount }).map((_, i) => {
          const cls =
            i < gluedCells
              ? "bg-emerald-500"
              : i < plannedCells
                ? "bg-blue-400 dark:bg-blue-500"
                : "bg-gray-100 dark:bg-gray-800";
          return <div key={i} className={cn("flex-1", cls)} />;
        })}
      </div>
    );
  }

  if (variant === "glow") {
    return (
      <div className={shell} style={shellStyle}>
        <div
          className="absolute inset-y-0 left-0 bg-blue-400 dark:bg-blue-500"
          style={{ width: `${plannedPct}%` }}
        />
        {glued > 0 && (
          <div
            className="cap-glow absolute inset-y-0 left-0 bg-emerald-500"
            style={{ width: `${gluedPct}%` }}
          />
        )}
      </div>
    );
  }

  if (variant === "inset") {
    return (
      <div className={shell} style={{ height: BAR_HEIGHT_PX + 4 }}>
        <div
          className="absolute inset-y-0 left-0 bg-blue-400 dark:bg-blue-500"
          style={{ width: `${plannedPct}%` }}
        />
        {glued > 0 && (
          <div
            className="absolute left-0 bg-emerald-500 rounded-full"
            style={{
              width: `${gluedPct}%`,
              top: 2,
              bottom: 2,
            }}
          />
        )}
      </div>
    );
  }

  return null;
}

const SCENARIOS: { label: string; glued: number; planned: number; max: number }[] = [
  { label: "0 / 900 / 1000", glued: 0, planned: 900, max: 1000 },
  { label: "400 / 900 / 1000", glued: 400, planned: 900, max: 1000 },
  { label: "850 / 900 / 1000", glued: 850, planned: 900, max: 1000 },
];

function cn(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(" ");
}

type BatteryConfig = {
  name: string;
  blurb: string;
  cells: number;
  gapPx: number;
  cellRadius: string;
  outerRadius: string;
  dividers?: boolean;
};

const BATTERY_VARIANTS: BatteryConfig[] = [
  {
    name: "Current — sharp",
    blurb: "10 cells · 2px gap · square corners",
    cells: 10,
    gapPx: 2,
    cellRadius: "0",
    outerRadius: "rounded-full",
  },
  {
    name: "Slight roundover (1px)",
    blurb: "10 cells · 2px gap · 1px corner",
    cells: 10,
    gapPx: 2,
    cellRadius: "1px",
    outerRadius: "rounded-full",
  },
  {
    name: "More roundover (2px)",
    blurb: "10 cells · 2px gap · 2px corner",
    cells: 10,
    gapPx: 2,
    cellRadius: "2px",
    outerRadius: "rounded-full",
  },
  {
    name: "More roundover · 15 cells",
    blurb: "15 cells · 2px gap · 2px corner",
    cells: 15,
    gapPx: 2,
    cellRadius: "2px",
    outerRadius: "rounded-full",
  },
  {
    name: "Pill cells",
    blurb: "10 cells · fully rounded each",
    cells: 10,
    gapPx: 2,
    cellRadius: "9999px",
    outerRadius: "rounded-full",
  },
  {
    name: "Tight gap",
    blurb: "10 cells · 1px gap · 1px corner",
    cells: 10,
    gapPx: 1,
    cellRadius: "1px",
    outerRadius: "rounded-full",
  },
  {
    name: "Wide gap",
    blurb: "10 cells · 3px gap · 1px corner",
    cells: 10,
    gapPx: 3,
    cellRadius: "1px",
    outerRadius: "rounded-full",
  },
  {
    name: "Hairline dividers",
    blurb: "10 cells · no gap · 1px divider",
    cells: 10,
    gapPx: 0,
    cellRadius: "0",
    outerRadius: "rounded-full",
    dividers: true,
  },
  {
    name: "Chunky 5",
    blurb: "5 cells · 2px gap · 1px corner",
    cells: 5,
    gapPx: 2,
    cellRadius: "1px",
    outerRadius: "rounded-full",
  },
  {
    name: "Fine 20",
    blurb: "20 cells · 1px gap · 1px corner",
    cells: 20,
    gapPx: 1,
    cellRadius: "1px",
    outerRadius: "rounded-full",
  },
  {
    name: "Outer pill, sharp inside",
    blurb: "10 cells · 2px gap · square cells, rounded shell",
    cells: 10,
    gapPx: 2,
    cellRadius: "0",
    outerRadius: "rounded-full",
  },
];

function BatteryBar({
  config,
  glued,
  planned,
  max,
}: {
  config: BatteryConfig;
  glued: number;
  planned: number;
  max: number;
}) {
  const gluedCells = Math.round((glued / max) * config.cells);
  const plannedCells = Math.round((planned / max) * config.cells);

  return (
    <div
      className={cn(
        "relative w-full flex overflow-hidden",
        config.outerRadius
      )}
      style={{ height: BAR_HEIGHT_PX, gap: config.gapPx }}
    >
      {Array.from({ length: config.cells }).map((_, i) => {
        const filled =
          i < gluedCells
            ? "bg-emerald-500"
            : i < plannedCells
              ? "bg-blue-400 dark:bg-blue-500"
              : "bg-gray-100 dark:bg-gray-800";
        return (
          <div
            key={i}
            className={cn("flex-1", filled)}
            style={{
              borderRadius: config.cellRadius,
              borderRight:
                config.dividers && i < config.cells - 1
                  ? "1px solid rgba(0,0,0,0.15)"
                  : undefined,
            }}
          />
        );
      })}
    </div>
  );
}

function BatteryDemo() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Battery-cell variations
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Same 3 scenarios as above. Compare cell count, gap, and corner radius.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {BATTERY_VARIANTS.map((v) => (
          <div
            key={v.name}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
          >
            <div className="flex items-baseline justify-between gap-2 mb-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {v.name}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {v.blurb}
              </span>
            </div>
            <div className="space-y-2.5">
              {SCENARIOS.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                    {s.label}
                  </span>
                  <div className="flex-1">
                    <BatteryBar
                      config={v}
                      glued={s.glued}
                      planned={s.planned}
                      max={s.max}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

type FillVariant = {
  key: string;
  name: string;
  blurb: string;
  className: string;
};

const FILL_VARIANTS: FillVariant[] = [
  {
    key: "slide-right",
    name: "Slide right (current)",
    blurb: "scaleX from left edge",
    className: "fill-slide-right",
  },
  {
    key: "iris",
    name: "Iris from center",
    blurb: "scaleX from cell center",
    className: "fill-iris",
  },
  {
    key: "drop-top",
    name: "Drop from top",
    blurb: "slides down into the cell",
    className: "fill-drop-top",
  },
  {
    key: "rise-bottom",
    name: "Rise from bottom",
    blurb: "slides up into the cell",
    className: "fill-rise-bottom",
  },
  {
    key: "pop",
    name: "Pop with overshoot",
    blurb: "scales up past 1 then settles",
    className: "fill-pop",
  },
  {
    key: "fade-scale",
    name: "Fade + scale",
    blurb: "opacity & scale together",
    className: "fill-fade-scale",
  },
  {
    key: "wipe-glow",
    name: "Wipe + leading glow",
    blurb: "scaleX with emerald shadow trail",
    className: "fill-wipe-glow",
  },
  {
    key: "diagonal",
    name: "Diagonal wipe",
    blurb: "clip-path slanted reveal",
    className: "fill-diagonal",
  },
  {
    key: "spring",
    name: "Springy slide",
    blurb: "scaleX with bounce overshoot",
    className: "fill-spring",
  },
  {
    key: "bubble",
    name: "Bubble pop",
    blurb: "swells taller, then settles into the cell",
    className: "fill-bubble",
  },
  {
    key: "smart",
    name: "Bubble + snake (smart)",
    blurb: "bubble for single fills, staggered slide for batches",
    className: "", // chosen per-cell from batch context
  },
];

const SNAKE_STAGGER_MS = 70;

const FILL_DEMO_CELLS = 15;

type Batch = { from: number; to: number };

function FillDemoBar({
  gluedCells,
  className,
  allowOverflow,
  smart,
  batch,
}: {
  gluedCells: number;
  className: string;
  allowOverflow?: boolean;
  smart?: boolean;
  batch?: Batch | null;
}) {
  const batchSize = batch ? batch.to - batch.from : 0;
  const isMulti = batchSize > 1;

  return (
    <div
      className={cn(
        "relative flex h-1.5 w-full rounded-full",
        allowOverflow ? "overflow-visible" : "overflow-hidden"
      )}
      style={{ gap: 2 }}
    >
      {Array.from({ length: FILL_DEMO_CELLS }).map((_, i) => {
        const isGreen = i < gluedCells;
        const inBatch = !!batch && i >= batch.from && i < batch.to;
        let cellAnimClass = className;
        let delayMs = 0;
        let cellAllowOverflow = allowOverflow;
        if (smart && inBatch) {
          if (isMulti) {
            cellAnimClass = "fill-snake";
            delayMs = (i - batch!.from) * SNAKE_STAGGER_MS;
            cellAllowOverflow = false;
          } else {
            cellAnimClass = "fill-bubble";
            cellAllowOverflow = true;
          }
        }
        return (
          <div
            key={i}
            className={cn(
              "relative flex-1 bg-gray-200 dark:bg-gray-800",
              cellAllowOverflow ? "overflow-visible" : "overflow-hidden"
            )}
            style={{ borderRadius: 2 }}
          >
            {isGreen && (
              <span
                aria-hidden
                className={cn("absolute inset-0 bg-emerald-500", cellAnimClass)}
                style={delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FillAnimationDemo() {
  const [{ glued, batch }, setState] = useState<{
    glued: number;
    batch: Batch | null;
  }>({ glued: 0, batch: null });

  const bump = (n: number) =>
    setState((s) => {
      const next = Math.min(FILL_DEMO_CELLS, s.glued + n);
      if (next === s.glued) return s;
      return { glued: next, batch: { from: s.glued, to: next } };
    });
  const reset = () => setState({ glued: 0, batch: null });

  return (
    <section>
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Fill-in animation options
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => bump(1)}
            className="h-8 px-3 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => bump(3)}
            className="h-8 px-3 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
          >
            +3
          </button>
          <button
            type="button"
            onClick={() => bump(5)}
            className="h-8 px-3 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition-colors"
          >
            +5
          </button>
          <button
            type="button"
            onClick={reset}
            className="h-8 px-3 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-xs font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Use <code className="text-xs">+1</code> / <code className="text-xs">+3</code> /{" "}
        <code className="text-xs">+5</code> to add cells one at a time or in batches. The
        last variant <em>Bubble + snake</em> uses bubble for +1 and a staggered slide for
        batches. Cells: {glued} / {FILL_DEMO_CELLS}.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {FILL_VARIANTS.map((v) => (
          <div
            key={v.key}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
          >
            <div className="flex items-baseline justify-between gap-2 mb-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {v.name}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {v.blurb}
              </span>
            </div>
            <FillDemoBar
              gluedCells={glued}
              className={v.className}
              allowOverflow={v.key === "bubble"}
              smart={v.key === "smart"}
              batch={batch}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function CapacityBarDemo() {
  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
        Capacity bar — overlap variants
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Three scenarios per variant: nothing glued, mid-progress, near-full. Pick one and I'll
        wire it into <code className="text-xs">CapacityIndicator</code>.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
        {CAP_VARIANTS.map((v) => (
          <div
            key={v.key}
            className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4"
          >
            <div className="flex items-baseline justify-between gap-2 mb-3">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {v.name}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {v.blurb}
              </span>
            </div>
            <div className="space-y-2.5">
              {SCENARIOS.map((s) => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-[11px] tabular-nums text-gray-500 dark:text-gray-400">
                    {s.label}
                  </span>
                  <div className="flex-1">
                    <CapBar
                      variant={v.key}
                      glued={s.glued}
                      planned={s.planned}
                      max={s.max}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

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

        <CapacityBarDemo />

        <FillAnimationDemo />

        <BatteryDemo />

        <Section
          title="Coral variations"
          blades={CORAL_VARIANTS}
          prefix="coral"
        />

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
