"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  GripVertical,
  Check,
  RotateCcw,
  ArrowRight,
  Archive,
  Truck,
  Package,
} from "lucide-react";
import { ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import { cn } from "@/utils/functions";

const ORDERED_STATUSES = [
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
];

interface StatusRadialMenuProps {
  currentStatus: ItemStatus;
  onStatusSelect: (status: ItemStatus) => void;
  className?: string;
}

interface MenuOption {
  status: ItemStatus;
  label: string;
  icon: React.ReactNode;
  angleStart: number;
  angleEnd: number;
  color: string;
}

const STATUS_CONFIG: Record<
  ItemStatus,
  { label: string; icon: React.ReactNode; color: string }
> = {
  [ItemStatus.New]: {
    label: "New",
    icon: <Archive size={16} />,
    color: `bg-${STATUS_COLORS[ItemStatus.New]}`,
  },
  [ItemStatus.OnDeck]: {
    label: "On Deck",
    icon: <RotateCcw size={16} />,
    color: `bg-${STATUS_COLORS[ItemStatus.OnDeck]}`,
  },
  [ItemStatus.Wip]: {
    label: "WIP",
    icon: <RotateCcw size={16} />,
    color: `bg-${STATUS_COLORS[ItemStatus.Wip]}`,
  },
  [ItemStatus.Packaging]: {
    label: "Packaging",
    icon: <Package size={16} />,
    color: `bg-${STATUS_COLORS[ItemStatus.Packaging]}`,
  },
  [ItemStatus.At_The_Door]: {
    label: "At Door",
    icon: <Truck size={16} />,
    color: `bg-${STATUS_COLORS[ItemStatus.At_The_Door]}`,
  },
  [ItemStatus.Done]: {
    label: "Done",
    icon: <Check size={16} />,
    color: `bg-${STATUS_COLORS[ItemStatus.Done]}`,
  },
  [ItemStatus.Hidden]: {
    label: "Hidden",
    icon: <Archive size={16} />,
    color: `bg-${STATUS_COLORS[ItemStatus.Hidden]}`,
  },
};

const MENU_RADIUS = 120; // Radius of the menu options
const TRIGGER_THRESHOLD = 30; // Minimum drag distance to trigger selection

export const StatusRadialMenu: React.FC<StatusRadialMenuProps> = ({
  currentStatus,
  onStatusSelect,
  className,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const triggerRef = useRef<HTMLDivElement>(null);

  const currentIndex = ORDERED_STATUSES.indexOf(currentStatus);

  // Calculate options based on current status
  const options: MenuOption[] = [];

  // Helper to add options
  const addOption = (status: ItemStatus, start: number, end: number) => {
    const config = STATUS_CONFIG[status];
    options.push({
      status,
      label: config.label,
      icon: config.icon,
      angleStart: start,
      angleEnd: end,
      color: config.color,
    });
  };

  // 1. Next Status (Right, -20 to 20)
  if (currentIndex < ORDERED_STATUSES.length - 1) {
    const nextStatus = ORDERED_STATUSES[currentIndex + 1];
    if (nextStatus) {
      addOption(nextStatus, -20, 20);
    }
  }

  // 2. Future Statuses (Bottom Right, 20 to 90)
  const futureStatuses = ORDERED_STATUSES.slice(currentIndex + 2);
  if (futureStatuses.length > 0) {
    const step = 70 / futureStatuses.length; // Spread over 70 degrees (20 to 90)
    futureStatuses.forEach((status, i) => {
      addOption(status, 20 + step * i, 20 + step * (i + 1));
    });
  }

  // 3. Previous Statuses (Top Right, -20 to -90)
  // We want the immediate previous to be closest to center (closest to -20)
  const prevStatuses = ORDERED_STATUSES.slice(0, currentIndex).reverse();
  if (prevStatuses.length > 0) {
    const step = 70 / prevStatuses.length; // Spread over 70 degrees (-20 to -90)
    prevStatuses.forEach((status, i) => {
      // Start from -20 and go more negative
      addOption(status, -20 - step * (i + 1), -20 - step * i);
    });
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); // Prevent text selection
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      setStartPos({ x: centerX, y: centerY });
      setCurrentPos({ x: e.clientX, y: e.clientY });
      setIsDragging(true);
    }
  };

  const getSelection = useCallback(
    (currentP: { x: number; y: number }, startP: { x: number; y: number }) => {
      const dx = currentP.x - startP.x;
      const dy = currentP.y - startP.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < TRIGGER_THRESHOLD) return null;

      let angle = Math.atan2(dy, dx) * (180 / Math.PI);
      // atan2 returns -180 to 180.
      // Right is 0, Down is 90, Up is -90.

      // Find matching option
      return options.find((opt) => {
        // Handle wrapping if needed (not needed for -90 to 90 range)
        return angle >= opt.angleStart && angle < opt.angleEnd;
      });
    },
    [options]
  );

  const activeOption =
    isDragging && startPos && currentPos
      ? getSelection(currentPos, startPos)
      : null;

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (isDragging) {
        setCurrentPos({ x: e.clientX, y: e.clientY });
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (isDragging) {
        if (activeOption) {
          onStatusSelect(activeOption.status);
        }
        setIsDragging(false);
        setStartPos(null);
        setCurrentPos(null);
      }
    };

    if (isDragging) {
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [isDragging, activeOption, onStatusSelect]);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center touch-none",
        className
      )}
    >
      <div
        ref={triggerRef}
        onPointerDown={handlePointerDown}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
      >
        <GripVertical className="text-gray-400" />
      </div>

      {isDragging &&
        startPos &&
        createPortal(
          <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Dim background slightly to focus attention */}
            {/* <div className="absolute inset-0 bg-black/10" /> */}

            {/* Menu Origin */}
            <div
              className="absolute"
              style={{
                left: startPos.x,
                top: startPos.y,
              }}
            >
              <AnimatePresence>
                {options.map((option) => {
                  const midAngle = (option.angleStart + option.angleEnd) / 2;
                  const rad = midAngle * (Math.PI / 180);
                  const x = Math.cos(rad) * MENU_RADIUS;
                  const y = Math.sin(rad) * MENU_RADIUS;

                  const isActive = activeOption?.status === option.status;

                  return (
                    <motion.div
                      key={option.status}
                      initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                      animate={{
                        scale: isActive ? 1.2 : 1,
                        opacity: 1,
                        x: x,
                        y: y,
                      }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        damping: 20,
                        stiffness: 300,
                      }}
                      className={cn(
                        "absolute flex flex-col items-center justify-center w-16 h-16 rounded-full shadow-lg -ml-8 -mt-8 border-2 border-white dark:border-gray-900",
                        option.color,
                        // Add text color contrast handling if needed, assuming white text is fine for these colors
                        "text-white"
                      )}
                    >
                      {option.icon}
                      <span className="text-[10px] font-bold mt-1">
                        {option.label}
                      </span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Drag Line Indicator */}
              <svg
                className="absolute top-0 left-0 overflow-visible"
                style={{ pointerEvents: "none" }}
              >
                {currentPos && (
                  <line
                    x1={0}
                    y1={0}
                    x2={currentPos.x - startPos.x}
                    y2={currentPos.y - startPos.y}
                    stroke="rgba(0,0,0,0.2)"
                    strokeWidth="2"
                    strokeDasharray="4"
                  />
                )}
              </svg>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
