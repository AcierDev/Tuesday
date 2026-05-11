import { memo } from "react";

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

const DEFAULT_WIDTH = 56;
const DEFAULT_HEIGHT = 14;
const STROKE_WIDTH = 1.25;
// Vertical padding as a fraction of the data range. 0 = peaks/troughs hit
// the chart edges for maximum vertical contrast.
const RANGE_PADDING_FRACTION = 0;
// Minimum padding (in data units) used when the data is perfectly flat,
// so a constant series renders as a horizontal line in the middle.
const FLAT_FALLBACK_PADDING = 0.5;

function MiniSparklineInner({
  data,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  className,
}: MiniSparklineProps) {
  if (!data.length) return null;

  // Scale to the data's own min/max (not anchored at zero) so small
  // movements on a large baseline (e.g. backlog ~5000±200) stay visible.
  const dataMin = Math.min(...data);
  const dataMax = Math.max(...data);
  const span = dataMax - dataMin;
  const pad = span > 0 ? span * RANGE_PADDING_FRACTION : FLAT_FALLBACK_PADDING;
  const min = dataMin - pad;
  const max = dataMax + pad;
  const range = max - min;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  // Inset the drawable y-range by half the stroke width so peaks/troughs
  // visibly touch the top/bottom edges instead of being half-clipped.
  const yInset = STROKE_WIDTH / 2;
  const innerHeight = height - yInset * 2;

  const points = data
    .map((v, i) => {
      const x = i * stepX;
      const y = yInset + innerHeight - ((v - min) / range) * innerHeight;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export const MiniSparkline = memo(MiniSparklineInner);
