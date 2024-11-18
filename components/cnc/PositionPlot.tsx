import { Position } from "@/typings/types";

// Position visualization component
export const PositionPlot = ({ position, plotSize, plotRange }) => {
  const positionToPixels = (pos: Position) => ({
    x: (pos.x / plotRange.x) * plotSize.width + plotSize.width / 2,
    y:
      plotSize.height -
      ((pos.y / plotRange.y) * plotSize.height + plotSize.height / 2),
  });

  return (
    <div
      className="relative"
      style={{ width: plotSize.width, height: plotSize.height }}
    >
      <svg
        width={plotSize.width}
        height={plotSize.height}
        className="border border-gray-300 dark:border-gray-600"
      >
        {/* Grid lines */}
        {Array.from({ length: 10 }).map((_, i) => (
          <>
            <line
              key={`v${i}`}
              x1={(plotSize.width * (i + 1)) / 10}
              y1={0}
              x2={(plotSize.width * (i + 1)) / 10}
              y2={plotSize.height}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
            <line
              key={`h${i}`}
              x1={0}
              y1={(plotSize.height * (i + 1)) / 10}
              x2={plotSize.width}
              y2={(plotSize.height * (i + 1)) / 10}
              stroke="currentColor"
              strokeOpacity={0.1}
            />
          </>
        ))}
        {/* Axes */}
        <line
          x1={0}
          y1={plotSize.height / 2}
          x2={plotSize.width}
          y2={plotSize.height / 2}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={2}
        />
        <line
          x1={plotSize.width / 2}
          y1={0}
          x2={plotSize.width / 2}
          y2={plotSize.height}
          stroke="currentColor"
          strokeOpacity={0.3}
          strokeWidth={2}
        />
        {/* Position marker */}
        <circle
          cx={positionToPixels(position).x}
          cy={positionToPixels(position).y}
          r={5}
          fill="currentColor"
        />
        {/* Machine trail */}
        <path
          d={`M ${positionToPixels(position).x} ${
            positionToPixels(position).y
          }`}
          stroke="currentColor"
          strokeOpacity={0.5}
          fill="none"
        />
      </svg>
      <div className="absolute top-0 left-0 text-xs">{plotRange.y} mm</div>
      <div className="absolute bottom-0 right-0 text-xs">{plotRange.x} mm</div>
    </div>
  );
};
