"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ItemStatus } from "@/typings/types";
import { cn } from "@/utils/functions";
import { OrdersIcon } from "@/components/icons/OrdersIcon";
import { STATUS_COLORS } from "@/typings/constants";

const STATUS_LABELS: Record<ItemStatus, string> = {
  [ItemStatus.New]: "New",
  [ItemStatus.OnDeck]: "On Deck",
  [ItemStatus.Wip]: "WIP",
  [ItemStatus.Packaging]: "Packaging",
  [ItemStatus.At_The_Door]: "At The Door",
  [ItemStatus.Done]: "Done",
  [ItemStatus.Hidden]: "Hidden",
};

const ORDERED_STATUSES = [
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
];

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📐 LAYOUT CONFIG                                                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const RECT_WIDTH = 158;
const RECT_HEIGHT = 46;
const RECT_GAP = 10;
const ROW_PITCH = RECT_HEIGHT + RECT_GAP;
const MENU_OFFSET_X = 22; // gap from icon center to left edge of rectangles
const INITIAL_X = -RECT_WIDTH / 2; // start collapsed at icon center
const HOVER_NUDGE_X = 10; // hovered option slides slightly further right
const HOVER_LOCKOUT_MS = 60; // wait for entrance to finish before enabling hover

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧩 COMPONENT                                                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

interface StatusRadialMenuProps {
  currentStatus: ItemStatus;
  onStatusSelect: (status: ItemStatus) => void;
  className?: string;
}

interface MenuOption {
  status: ItemStatus;
  label: string;
  textColor: string;
  y: number; // final y offset relative to icon center
}

export const StatusRadialMenu: React.FC<StatusRadialMenuProps> = ({
  currentStatus,
  onStatusSelect,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [originPos, setOriginPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [hoverEnabled, setHoverEnabled] = useState(false);
  const [hoveredStatus, setHoveredStatus] = useState<ItemStatus | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const visibleStatuses = ORDERED_STATUSES.filter((s) => s !== currentStatus);
  const middle = (visibleStatuses.length - 1) / 2;

  const options: MenuOption[] = visibleStatuses.map((status, i) => ({
    status,
    label: STATUS_LABELS[status],
    textColor: STATUS_COLORS[status],
    y: (i - middle) * ROW_PITCH,
  }));

  const openMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setOriginPos({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      setIsOpen(true);
    }
  };

  const selectOption = (status: ItemStatus) => {
    onStatusSelect(status);
    setIsOpen(false);
  };

  // Hover lockout — disable hover-driven nudge until the entrance animation
  // settles. Otherwise the bubble that spawns under the cursor gets stuck in
  // hover state because pointerleave never fires for a stationary cursor.
  useEffect(() => {
    if (!isOpen) {
      setHoverEnabled(false);
      setHoveredStatus(null);
      return;
    }
    const id = window.setTimeout(
      () => setHoverEnabled(true),
      HOVER_LOCKOUT_MS
    );
    return () => window.clearTimeout(id);
  }, [isOpen]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleDocPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      // Pills live in the portal — they handle their own click and close
      // the menu themselves. Anything else is "outside".
      const portalRoot = document.getElementById(
        "status-radial-menu-portal"
      );
      if (portalRoot?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    // Defer attaching the outside-click handler so the same click that
    // opened the menu doesn't immediately close it.
    const id = window.setTimeout(() => {
      document.addEventListener("pointerdown", handleDocPointerDown);
    }, 0);
    document.addEventListener("keydown", handleKey);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener("pointerdown", handleDocPointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center",
        className
      )}
    >
      <div
        ref={triggerRef}
        onClick={openMenu}
        className="cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
      >
        <OrdersIcon className="w-5 h-5 text-gray-400" />
      </div>

      {isOpen &&
        originPos &&
        createPortal(
          <div
            id="status-radial-menu-portal"
            className="fixed inset-0 z-[9999] pointer-events-none"
          >
            <div
              className="absolute"
              style={{
                left: originPos.x,
                top: originPos.y,
              }}
            >
              <AnimatePresence>
                {options.map((option) => {
                  const isHovered =
                    hoverEnabled && hoveredStatus === option.status;
                  return (
                  <motion.button
                    key={option.status}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectOption(option.status);
                    }}
                    onMouseEnter={() => {
                      if (hoverEnabled) setHoveredStatus(option.status);
                    }}
                    onMouseLeave={() => {
                      if (hoverEnabled) setHoveredStatus(null);
                    }}
                    initial={{
                      x: INITIAL_X,
                      y: 0,
                      scaleX: 0.08,
                      scaleY: 0.2,
                      opacity: 0,
                    }}
                    animate={{
                      x: MENU_OFFSET_X + (isHovered ? HOVER_NUDGE_X : 0),
                      y: option.y,
                      scaleX: isHovered ? 1.04 : 1,
                      scaleY: isHovered ? 1.04 : 1,
                      opacity: 1,
                    }}
                    exit={{
                      x: INITIAL_X,
                      y: 0,
                      scaleX: 0.08,
                      scaleY: 0.2,
                      opacity: 0,
                    }}
                    transition={{
                      type: "tween",
                      duration: 0.0675,
                      ease: [0.2, 0.8, 0.3, 1],
                    }}
                    style={{
                      width: RECT_WIDTH,
                      height: RECT_HEIGHT,
                      marginTop: -RECT_HEIGHT / 2,
                    }}
                    className={cn(
                      "pointer-events-auto absolute left-0 top-0 flex items-center justify-center px-5 rounded-xl text-sm font-semibold tracking-wide cursor-pointer glass-surface transition",
                      `text-${option.textColor} dark:text-${option.textColor}`
                    )}
                  >
                    {option.label}
                  </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
