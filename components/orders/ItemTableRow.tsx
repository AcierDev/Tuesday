"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Truck } from "lucide-react";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";
import { TableCell } from "@/components/ui/table";
import { Portal } from "@/components/ui/portal";
import { MergedShippingCell } from "../cells/MergedShippingCell";
import { ItemTableCell } from "./ItemTableCell";
import { ItemActions } from "./ItemActions";
import { cn } from "@/utils/functions";
import {
  Activity,
  ColumnTitles,
  Item,
  ItemStatus,
  ColumnTypes,
  DayName,
} from "@/typings/types";
import { boardConfig } from "@/config/boardconfig";
import { useActivities } from "@/lib/stats-shared";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";

// Rows whose item is in today's planner lane get a small TODAY tag above
// the DueBadge inside NameCell — no row-level border treatment.

// Item ids whose most recent status_change activity falls inside the
// `recentEditHours` window. Computed once per (activities, hours) pair and
// shared across every row via the module-level cache so that mounting N
// rows doesn't recompute N times.
let recentlyMovedCache: {
  activities: Activity[];
  hours: number;
  set: Set<string>;
} | null = null;

function useRecentlyMovedIds(): Set<string> {
  const { activities } = useActivities();
  const { settings } = useOrderSettings();
  const hours = settings.recentEditHours;

  return useMemo(() => {
    if (!activities || hours === undefined) return new Set<string>();
    if (
      recentlyMovedCache &&
      recentlyMovedCache.activities === activities &&
      recentlyMovedCache.hours === hours
    ) {
      return recentlyMovedCache.set;
    }
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    const set = new Set<string>();
    for (const a of activities) {
      if (a.type !== "status_change") continue;
      if (a.timestamp >= cutoff) set.add(a.itemId);
    }
    recentlyMovedCache = { activities, hours, set };
    return set;
  }, [activities, hours]);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📲 SWIPE-TO-MOVE GESTURE                                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// iOS Mail-style: swipe right reveals "earlier" statuses on the left,
// swipe left reveals "later" statuses on the right. The button closest to
// the row is the immediately-prior / immediately-next status. Touch-only —
// desktop mouse drag is left untouched so text selection still works.

const SWIPE_PANEL_WIDTH = 220;
const SWIPE_TRIGGER_PX = 60;
const SWIPE_VELOCITY_PROJECTION_S = 0.05;
const MAX_OPTIONS_PER_SIDE = 3;
const SWIPE_SPRING = { type: "spring" as const, stiffness: 600, damping: 38 };

const STATUS_CHAIN: readonly ItemStatus[] = [
  ItemStatus.Hidden,
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
];

const STATUS_PANEL_BG: Record<ItemStatus, string> = {
  [ItemStatus.Hidden]: "bg-gray-500 dark:bg-gray-600",
  [ItemStatus.New]: "bg-gray-500 dark:bg-gray-400",
  [ItemStatus.OnDeck]: "bg-yellow-600 dark:bg-yellow-500",
  [ItemStatus.Wip]: "bg-orange-600 dark:bg-orange-500",
  [ItemStatus.Packaging]: "bg-red-500 dark:bg-red-500",
  [ItemStatus.At_The_Door]: "bg-lime-600 dark:bg-lime-500",
  [ItemStatus.Done]: "bg-green-600 dark:bg-green-500",
};

const STATUS_PANEL_LABEL: Record<ItemStatus, string> = {
  [ItemStatus.Hidden]: "Hide",
  [ItemStatus.New]: "New",
  [ItemStatus.OnDeck]: "On Deck",
  [ItemStatus.Wip]: "WIP",
  [ItemStatus.Packaging]: "Pack",
  [ItemStatus.At_The_Door]: "Door",
  [ItemStatus.Done]: "Done",
};

function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(hover: none) and (pointer: coarse)");
    setIsTouch(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return isTouch;
}

interface ItemTableRowProps {
  item: Item;
  index: number;
  visibleColumns: ColumnTitles[];
  onContextMenu: (e: React.MouseEvent, item: Item) => void;
  onDaySelect: (itemId: string, date: Date) => void;
  onAddToSchedule: (
    weekKey: string,
    day: DayName,
    itemId: string
  ) => Promise<void>;
  onScheduleUpdate: () => void;
  onDelete: (item: Item) => void;
  onEdit: (item: Item) => void;
  onGetLabel: (item: Item) => void;
  onMarkCompleted: (itemId: string) => Promise<void>;
  onShip: (itemId: string) => Promise<void>;
  onStatusChange?: (itemId: string, newStatus: ItemStatus) => Promise<void>;
  clickToAddTarget?: { day: DayName; weekKey: string } | null;
  onItemClick?: (item: Item) => Promise<void>;
  isInTransit?: boolean;
}

export const ItemTableRow = memo(function ItemTableRow({
  item,
  index,
  visibleColumns,
  onContextMenu,
  onDaySelect,
  onAddToSchedule,
  onScheduleUpdate,
  onDelete,
  onEdit,
  onGetLabel,
  onMarkCompleted,
  onShip,
  onStatusChange,
  clickToAddTarget,
  onItemClick,
  isInTransit = false,
}: ItemTableRowProps) {
  const recentlyMoved = useRecentlyMovedIds().has(item.id);
  const isTouch = useIsTouchDevice();

  //── swipe state ───────────────────────────────────────────────────────
  const rowRef = useRef<HTMLTableRowElement | null>(null);

  const x = useMotionValue(0);
  const [openSide, setOpenSide] = useState<"left" | "right" | null>(null);
  const [restRect, setRestRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  // Mirror x into state so clip-path values can re-render. Each row drives
  // its own subscription, so cost is bounded to the row currently being
  // swiped — siblings don't re-render.
  const [xValue, setXValue] = useState(0);

  const { backward, forward } = useMemo(() => {
    const idx = STATUS_CHAIN.indexOf(item.status);
    if (idx < 0)
      return { backward: [] as ItemStatus[], forward: [] as ItemStatus[] };
    return {
      // Trailing slice keeps chain order so the rightmost button (closest
      // to the row) is the immediately-prior status.
      backward: STATUS_CHAIN.slice(0, idx).slice(-MAX_OPTIONS_PER_SIDE),
      forward: STATUS_CHAIN.slice(idx + 1).slice(0, MAX_OPTIONS_PER_SIDE),
    };
  }, [item.status]);

  const canSwipe = isTouch && !!onStatusChange;
  const canSwipeRight = canSwipe && backward.length > 0;
  const canSwipeLeft = canSwipe && forward.length > 0;

  const updateRestRect = useCallback(() => {
    const node = rowRef.current;
    if (!node) return;
    const r = node.getBoundingClientRect();
    setRestRect({
      top: r.top,
      // Subtract current transform so the captured rect is the row's
      // un-translated position — panels stay anchored mid-drag.
      left: r.left - x.get(),
      width: r.width,
      height: r.height,
    });
  }, [x]);

  const closeSwipe = useCallback(() => {
    setOpenSide(null);
    animate(x, 0, SWIPE_SPRING);
  }, [x]);

  useEffect(() => {
    setXValue(x.get());
    return x.on("change", (v) => setXValue(v));
  }, [x]);

  // Refresh rect on scroll/resize whenever the row is "live" (open or being
  // dragged). At rest, listeners stay detached so siblings don't pay for it.
  const isLive = openSide !== null || Math.abs(xValue) > 0.5;
  useEffect(() => {
    if (!isLive) return;
    updateRestRect();
    const onChange = () => updateRestRect();
    window.addEventListener("scroll", onChange, true);
    window.addEventListener("resize", onChange);
    return () => {
      window.removeEventListener("scroll", onChange, true);
      window.removeEventListener("resize", onChange);
    };
  }, [isLive, updateRestRect]);

  // Tap outside an open row → close. Buttons inside the panels carry
  // data-swipe-panel so taps on them don't re-trigger the close.
  useEffect(() => {
    if (!openSide) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-swipe-panel]")) return;
      if (rowRef.current?.contains(target)) return;
      closeSwipe();
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [openSide, closeSwipe]);

  const handleDragStart = useCallback(() => {
    updateRestRect();
  }, [updateRestRect]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const projected =
        info.offset.x + info.velocity.x * SWIPE_VELOCITY_PROJECTION_S;
      if (projected > SWIPE_TRIGGER_PX && canSwipeRight) {
        animate(x, SWIPE_PANEL_WIDTH, SWIPE_SPRING);
        setOpenSide("left");
      } else if (projected < -SWIPE_TRIGGER_PX && canSwipeLeft) {
        animate(x, -SWIPE_PANEL_WIDTH, SWIPE_SPRING);
        setOpenSide("right");
      } else {
        closeSwipe();
      }
    },
    [x, canSwipeRight, canSwipeLeft, closeSwipe]
  );

  const handleSelectStatus = useCallback(
    async (status: ItemStatus) => {
      closeSwipe();
      if (onStatusChange) await onStatusChange(item.id, status);
    },
    [closeSwipe, item.id, onStatusChange]
  );

  if (!item.id) {
    console.warn("Item missing id:", item);
    return null;
  }

  // How much of each panel is still hidden, applied to the *outer* edge so
  // the reveal tracks the screen edge as the row slides — leftmost button
  // appears first when swiping right, rightmost first when swiping left.
  const leftPanelHiddenPx = Math.max(
    0,
    SWIPE_PANEL_WIDTH - Math.max(0, xValue)
  );
  const rightPanelHiddenPx = Math.max(
    0,
    SWIPE_PANEL_WIDTH - Math.max(0, -xValue)
  );

  return (
    <>
      <motion.tr
        ref={rowRef}
        drag={canSwipe ? "x" : false}
        dragDirectionLock
        dragConstraints={{
          left: canSwipeLeft ? -SWIPE_PANEL_WIDTH : 0,
          right: canSwipeRight ? SWIPE_PANEL_WIDTH : 0,
        }}
        dragElastic={0.18}
        style={{ x }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={cn(
          "select-none",
          index % 2 === 0
            ? "bg-white dark:bg-gray-800"
            : "bg-gray-50 dark:bg-gray-800/60",
          "transition-colors duration-200",
          // Hover tints only on devices with a real pointer — mobile webkit
          // leaves ghost-hover state on tapped rows during scroll, which made
          // random rows look highlighted while flicking through the list.
          !isTouch &&
            "hover:bg-gray-100 dark:hover:bg-gray-700/70",
          clickToAddTarget &&
            cn(
              "cursor-crosshair",
              !isTouch && "hover:bg-blue-50 dark:hover:bg-blue-900/20"
            ),
          openSide && "relative z-10"
        )}
        onClick={(e) => {
          if (clickToAddTarget) {
            e.preventDefault();
            onItemClick?.(item);
          }
        }}
        onContextMenu={(e) => {
          if (clickToAddTarget) {
            e.preventDefault();
            return;
          }
          onContextMenu(e, item);
        }}
      >
        {/* Slim indicator strip — used to host the drag handle, replaced by
            the swipe-to-move gesture. Kept as a narrow cell so the recently-
            moved dot and in-transit truck still have a home, freeing the
            previous handle width back to the content columns. Always rendered
            (even when empty) so table-fixed column widths line up across rows. */}
        <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-0 relative w-5 sm:w-6">
          <div className="flex flex-col items-end justify-center gap-0.5 py-1 pr-0.5">
            {isInTransit && (
              <Truck
                aria-label="In transit"
                className="h-3 w-3 text-blue-500"
              />
            )}
            {recentlyMoved && (
              <span
                aria-label="Moved recently"
                className="block w-1.5 h-1.5 rounded-full bg-blue-500"
              />
            )}
          </div>
        </TableCell>

        {visibleColumns.includes("Shipping" as ColumnTitles) && (
          <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-0 text-center w-8 sm:w-[3.625rem]">
            <MergedShippingCell item={item} />
          </TableCell>
        )}

        {visibleColumns
          .filter((columnName) => columnName !== "Shipping")
          .map((columnName, cellIndex) => {
            // Reconstruct pseudo-column-value for the cell
            // This is a compatibility layer. Ideally cells should take raw values.
            const fieldMap: Record<string, keyof Item> = {
              [ColumnTitles.Customer_Name]: "customerName",
              [ColumnTitles.Due]: "dueDate",
              [ColumnTitles.Design]: "design",
              [ColumnTitles.Size]: "size",
              [ColumnTitles.Painted]: "painted",
              [ColumnTitles.Backboard]: "backboard",
              [ColumnTitles.Glued]: "glued",
              [ColumnTitles.Packaging]: "packaging",
              [ColumnTitles.Boxes]: "boxes",
              [ColumnTitles.Notes]: "notes",
              [ColumnTitles.Rating]: "rating",
              [ColumnTitles.Shipping]: "shipping",
              [ColumnTitles.Labels]: "labels",
            };

            const key = fieldMap[columnName];
            // Force the type for now as strings
            const textValue = key ? String(item[key] || "") : "";

            const columnValue: any = {
              columnName,
              type: boardConfig.columns[columnName]?.type || ColumnTypes.Text,
              text: textValue,
            };

            return (
              <ItemTableCell
                key={`${item.id}-${columnName}`}
                item={item}
                columnValue={columnValue}
                columnName={columnName}
                cellIndex={cellIndex}
                onDaySelect={onDaySelect}
                onAddToSchedule={onAddToSchedule}
                onScheduleUpdate={onScheduleUpdate}
              />
            );
          })}

        <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-0 text-center w-8">
          <ItemActions
            item={item}
            onDelete={onDelete}
            onEdit={onEdit}
            onGetLabel={onGetLabel}
            onMarkCompleted={onMarkCompleted}
            onShip={onShip}
          />
        </TableCell>
      </motion.tr>

      {canSwipe && isLive && restRect && (
        <Portal>
          {backward.length > 0 && (
            <div
              data-swipe-panel="left"
              style={{
                position: "fixed",
                top: restRect.top,
                height: restRect.height,
                left: restRect.left,
                width: SWIPE_PANEL_WIDTH,
                // Clip from the right so the panel uncovers from the
                // screen-edge inward: as the row slides right, the leftmost
                // button surfaces first.
                clipPath: `inset(0 ${leftPanelHiddenPx}px 0 0)`,
                zIndex: 40,
                pointerEvents: openSide === "left" ? "auto" : "none",
              }}
              className="flex items-stretch gap-1 p-1 overflow-hidden"
            >
              {backward.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleSelectStatus(status)}
                  className={cn(
                    "flex-1 flex items-center justify-center text-xs font-semibold text-white px-1 rounded-lg",
                    STATUS_PANEL_BG[status]
                  )}
                >
                  {STATUS_PANEL_LABEL[status]}
                </button>
              ))}
            </div>
          )}
          {forward.length > 0 && (
            <div
              data-swipe-panel="right"
              style={{
                position: "fixed",
                top: restRect.top,
                height: restRect.height,
                left: restRect.left + restRect.width - SWIPE_PANEL_WIDTH,
                width: SWIPE_PANEL_WIDTH,
                // Mirror of the left panel: clip from the left so the row
                // sliding left exposes the rightmost button first from the
                // screen edge inward.
                clipPath: `inset(0 0 0 ${rightPanelHiddenPx}px)`,
                zIndex: 40,
                pointerEvents: openSide === "right" ? "auto" : "none",
              }}
              className="flex items-stretch gap-1 p-1 overflow-hidden"
            >
              {forward.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => handleSelectStatus(status)}
                  className={cn(
                    "flex-1 flex items-center justify-center text-xs font-semibold text-white px-1 rounded-lg",
                    STATUS_PANEL_BG[status]
                  )}
                >
                  {STATUS_PANEL_LABEL[status]}
                </button>
              ))}
            </div>
          )}
        </Portal>
      )}
    </>
  );
});
