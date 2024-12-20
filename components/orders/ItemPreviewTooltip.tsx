import { Card } from "@/components/ui/card";
import { Item, ColumnTitles, ItemDesigns, ItemSizes } from "@/typings/types";
import {
  DESIGN_COLOR_NAMES,
  DESIGN_COLORS,
  DesignBlends,
} from "@/typings/constants";
import { calculateAmountRequiredPerColor } from "@/utils/functions";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Position {
  top?: string;
  bottom?: string;
  left: string;
  right?: string;
  marginLeft: string;
  marginRight?: string;
  marginBottom?: string;
  transform?: string;
}

interface ItemPreviewTooltipProps {
  item: Item;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const createBackground = (design: ItemDesigns) => {
  const colors = DesignBlends[design];
  if (colors && colors.length > 0) {
    return `linear-gradient(to right, ${colors.join(", ")})`;
  }
  return "#000000"; // Fallback color
};

export function ItemPreviewTooltip({
  item,
  onMouseEnter,
  onMouseLeave,
}: ItemPreviewTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [showColorBreakdown, setShowColorBreakdown] = useState(false);
  const [position, setPosition] = useState<Position>({
    left: "100%",
    marginLeft: "0.5rem",
  });

  const hasPositioned = useRef(false);

  const size =
    item.values.find((v) => v.columnName === ColumnTitles.Size)?.text || "";
  const design = item.values.find((v) => v.columnName === ColumnTitles.Design)
    ?.text as ItemDesigns;

  if (!size || !design) return null;

  const [width = 0, height = 0] = size.split("x").map(Number);
  const totalPieces = width * height;

  const colorNames = DESIGN_COLOR_NAMES[design] || [];
  const piecesPerColor = Math.floor(totalPieces / colorNames.length);
  const extraPieces = totalPieces % colorNames.length;

  const decimalAmountPerColor = calculateAmountRequiredPerColor(
    design,
    size as ItemSizes
  );

  useEffect(() => {
    const updatePosition = () => {
      const tooltip = tooltipRef.current;
      if (!tooltip) return;

      const rect = tooltip.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      const parentRect = tooltip.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const spaceBelow = viewportHeight - parentRect.top;
      const tooltipHeight = rect.height;

      if (
        hasPositioned.current &&
        rect.height > 0 &&
        rect.width > 0 &&
        position.top !== undefined
      ) {
        return;
      }

      let newPosition: Position = {
        left: "100%",
        marginLeft: "0.5rem",
      };

      if (spaceBelow >= tooltipHeight) {
        newPosition = {
          ...newPosition,
          top: "0",
        };
      } else {
        newPosition = {
          ...newPosition,
          bottom: "100%",
          marginBottom: "0.5rem",
        };
      }

      if (parentRect.left + rect.width + 100 > viewportWidth) {
        newPosition = {
          ...newPosition,
          left: "auto",
          right: "100%",
          marginLeft: "0",
          marginRight: "0.5rem",
        };
      }

      hasPositioned.current = true;
      setPosition(newPosition);
    };

    hasPositioned.current = false;

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, []);

  return (
    <motion.div
      ref={tooltipRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "absolute" as const,
        zIndex: 100,
        ...position,
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Card className="p-4 bg-white/95 dark:bg-gray-800/95 shadow-xl rounded-xl w-80 border-2 border-gray-200 dark:border-gray-700 backdrop-blur-sm">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3">
            <h3 className="font-medium text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-500" />
              Design Preview
            </h3>
            <span
              className="px-2 py-1 rounded-md text-sm font-medium text-white"
              style={{ background: createBackground(design) }}
            >
              {design}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Size", value: size },
              { label: "Total", value: `${totalPieces} pcs` },
              { label: "Colors", value: colorNames.length },
              {
                label: "Per Color",
                value: `${decimalAmountPerColor.toFixed(1)}`,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg"
              >
                <div className="text-gray-500 dark:text-gray-400 text-xs mb-1">
                  {label}
                </div>
                <div className="font-medium">{value}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowColorBreakdown(!showColorBreakdown)}
            className="w-full flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <span>Color Distribution</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showColorBreakdown ? "rotate-180" : ""
              }`}
            />
          </button>

          <AnimatePresence>
            {showColorBreakdown && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-2 overflow-hidden"
              >
                {colorNames.map((colorName, index) => {
                  const pieces =
                    index < extraPieces ? piecesPerColor + 1 : piecesPerColor;
                  const color =
                    DESIGN_COLORS[design]?.[colorName as number]?.hex;
                  const percentage = ((pieces / totalPieces) * 100).toFixed(1);

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      key={colorName}
                      className="relative flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 overflow-hidden group hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 opacity-20 transition-all group-hover:opacity-20"
                        style={{
                          width: `100%`,
                          backgroundColor: color,
                        }}
                      />
                      <div className="flex items-center gap-2 z-10">
                        {color && (
                          <div
                            className="w-4 h-4 rounded-full border border-gray-200 dark:border-gray-600 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        )}
                        <span className="text-sm font-medium">{colorName}</span>
                      </div>
                      <div className="flex items-center gap-2 z-10">
                        <span className="text-sm tabular-nums font-medium">
                          {pieces}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({percentage}%)
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Card>
    </motion.div>
  );
}
