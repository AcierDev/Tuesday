"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  animate,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { useDraggable } from "@dnd-kit/core";
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
// Distance/velocity-projected position needed to commit an open from rest.
// Higher than the initial 60px so a small flick doesn't trip the trigger.
const SWIPE_OPEN_TRIGGER_PX = 90;
// From an open state, the row must travel at least this far back toward 0
// before the gesture is interpreted as "close". Hysteresis: closing is a
// deliberate action, and the gesture never flips past 0 to the opposite
// side in a single drag.
const SWIPE_CLOSE_THRESHOLD_PX = SWIPE_PANEL_WIDTH * 0.5;
const SWIPE_VELOCITY_PROJECTION_S = 0.04;
const MAX_OPTIONS_PER_SIDE = 3;
// Mild bounce on the open/close release — damping ratio ~0.69 gives a
// subtle overshoot that "pops" into place without feeling jelly.
const SWIPE_SPRING = {
  type: "spring" as const,
  stiffness: 500,
  damping: 26,
  mass: 0.7,
};
const SWIPE_BUTTON_SPRING = {
  type: "spring" as const,
  stiffness: 500,
  damping: 22,
};
const ROW_OPEN_RADIUS_PX = 10;

// Hidden is intentionally NOT in the swipe chain — it's too easy to flick a
// row into Hidden by accident on mobile and lose track of the order. Hiding
// stays available on desktop via the right-click menu / drag-to-section.
const STATUS_CHAIN: readonly ItemStatus[] = [
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
];

// Snap an item's size to one of the four known height tiers so external
// stylesheets (e.g. /orders-redesign-preview) can color rows by size with a
// stable selector. Always returns a value — sizes that don't parse get
// "unknown" so the preview can still target the row by attribute. Inert on
// the live page — no CSS targets this attribute.
const ROW_HEIGHT_TIERS = [7, 10, 12, 16] as const;
function rowHeightTier(size: string | undefined | null): string {
  const m = size?.trim().match(/^(\d+)\s*[x×X]\s*(\d+)$/);
  if (!m) return "unknown";
  const h = parseInt(m[2] ?? "", 10);
  if (!h) return "unknown";
  let best: number = ROW_HEIGHT_TIERS[0];
  let bestDist = Infinity;
  for (const t of ROW_HEIGHT_TIERS) {
    const d = Math.abs(h - t);
    if (d < bestDist) {
      bestDist = d;
      best = t;
    }
  }
  return String(best);
}

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
}: ItemTableRowProps) {
  const recentlyMoved = useRecentlyMovedIds().has(item.id);
  const isTouch = useIsTouchDevice();

  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 🤚 DESKTOP DRAG HANDLE                                               ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  // Desktop drag-between-sections is dnd-kit driven (page-level DndContext
  // owns the drop targets on each section header). Touch keeps the
  // framer-motion swipe-to-move gesture so the two systems never compete
  // for the same pointer.
  const canDesktopDrag = !isTouch && !!onStatusChange;
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragHandleRef,
    isDragging,
  } = useDraggable({
    id: item.id,
    data: { itemId: item.id, status: item.status },
    disabled: !canDesktopDrag,
  });

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
  // Tracks "is the row visibly off-rest?" but only flips on threshold
  // crossing — so the row doesn't re-render every motion frame during a
  // gesture. Per-frame visuals (clip-paths, row radius) are driven by
  // useTransform and written straight to the DOM by framer-motion.
  const [hasOffset, setHasOffset] = useState(false);

  // Panels slide 1:1 with the row instead of being clip-path-revealed.
  // clipPath repaints every frame on mobile and visibly trails the finger;
  // translate stays on the compositor, so the panels track the gesture
  // exactly. Each panel's edge stays glued to the matching row edge.
  const leftPanelX = useTransform(x, (v) => Math.max(0, v));
  const rightPanelX = useTransform(x, (v) => Math.min(0, v));
  // Row picks up rounded corners while it's swiped — matches the radius
  // of the status pills behind it.
  const rowClipPath = useTransform(x, (v) =>
    Math.abs(v) > 0.5
      ? `inset(0 round ${ROW_OPEN_RADIUS_PX}px)`
      : `inset(0)`
  );

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

  // Subscribe to the motion value but only flip hasOffset when crossing
  // the 0.5px threshold — so we get one re-render at start of gesture and
  // one at end, not 60+ during the swipe.
  useEffect(() => {
    const apply = (v: number) => {
      const next = Math.abs(v) > 0.5;
      setHasOffset((prev) => (prev === next ? prev : next));
    };
    apply(x.get());
    return x.on("change", apply);
  }, [x]);

  // Refresh rect on scroll/resize whenever the row is "live" (open or being
  // dragged). At rest, listeners stay detached so siblings don't pay for it.
  const isLive = openSide !== null || hasOffset;
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
    // Mount the panels synchronously — without this, hasOffset only flips
    // after x crosses 0.5px on the next frame, leaving the row visibly
    // moving before its panels are in the DOM.
    setHasOffset(true);
  }, [updateRestRect]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      // Project from the *current absolute position* rather than the drag
      // offset. Using offset breaks closing from an open state: a drag of
      // -220 to bring the row back to 0 looks like a "swipe-left to open
      // right" if you only see the offset.
      const projected = x.get() + info.velocity.x * SWIPE_VELOCITY_PROJECTION_S;

      // From open: only "stay open" or "close" — never flip past 0 to the
      // opposite side in one gesture, no matter how strong the flick.
      if (openSide === "left") {
        if (projected < SWIPE_CLOSE_THRESHOLD_PX) {
          setOpenSide(null);
          animate(x, 0, SWIPE_SPRING);
        } else {
          animate(x, SWIPE_PANEL_WIDTH, SWIPE_SPRING);
        }
        return;
      }
      if (openSide === "right") {
        if (projected > -SWIPE_CLOSE_THRESHOLD_PX) {
          setOpenSide(null);
          animate(x, 0, SWIPE_SPRING);
        } else {
          animate(x, -SWIPE_PANEL_WIDTH, SWIPE_SPRING);
        }
        return;
      }
      // From closed: open in either direction once past the trigger.
      if (projected > SWIPE_OPEN_TRIGGER_PX && canSwipeRight) {
        animate(x, SWIPE_PANEL_WIDTH, SWIPE_SPRING);
        setOpenSide("left");
      } else if (projected < -SWIPE_OPEN_TRIGGER_PX && canSwipeLeft) {
        animate(x, -SWIPE_PANEL_WIDTH, SWIPE_SPRING);
        setOpenSide("right");
      } else {
        closeSwipe();
      }
    },
    [x, openSide, canSwipeRight, canSwipeLeft, closeSwipe]
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

  // Whole-row drag on desktop: pointer-down anywhere on the row starts a
  // potential drag. The MouseSensor's 6px activation distance lets short
  // clicks through to badges/buttons without triggering. Interactive cells
  // (badges, action menus, due-date popover, shipping cell) stop the
  // pointerdown so the user can interact with them without snagging a drag.
  const rowDragRef = useCallback(
    (node: HTMLTableRowElement | null) => {
      rowRef.current = node;
      if (canDesktopDrag) setDragHandleRef(node);
    },
    [canDesktopDrag, setDragHandleRef]
  );
  const rowDragListeners = canDesktopDrag ? dragListeners : undefined;
  const rowDragAttributes = canDesktopDrag ? dragAttributes : undefined;

  return (
    <>
      <motion.tr
        ref={rowDragRef}
        data-h-tier={rowHeightTier(item.size)}
        drag={canSwipe ? "x" : false}
        dragDirectionLock
        dragConstraints={{
          left: canSwipeLeft ? -SWIPE_PANEL_WIDTH : 0,
          right: canSwipeRight ? SWIPE_PANEL_WIDTH : 0,
        }}
        dragElastic={0.18}
        style={{ x, clipPath: rowClipPath }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        {...rowDragAttributes}
        {...rowDragListeners}
        className={cn(
          "group select-none",
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
          openSide && "relative z-10",
          canDesktopDrag && !clickToAddTarget && "cursor-grab",
          isDragging && "opacity-40 cursor-grabbing"
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
        {/* Slim indicator strip — hosts the recently-moved dot. Always rendered
            (even when empty) so table-fixed column widths line up across rows. */}
        <TableCell className="border-b border-gray-100 dark:border-gray-700/60 p-0 relative w-5 sm:w-6">
          <div className="flex flex-col items-end justify-center gap-0.5 py-1 pr-0.5">
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
            <motion.div
              data-swipe-panel="left"
              style={{
                position: "fixed",
                top: restRect.top,
                height: restRect.height,
                // Parked one panel-width left of the row at rest, then
                // slides right in lockstep with `x` — the panel's right
                // edge stays glued to the row's left edge throughout the
                // swipe, so the immediately-prior status button (rightmost
                // in the panel) leads in from the row edge.
                left: restRect.left - SWIPE_PANEL_WIDTH,
                width: SWIPE_PANEL_WIDTH,
                x: leftPanelX,
                zIndex: 40,
                pointerEvents: openSide === "left" ? "auto" : "none",
              }}
              className="flex items-stretch gap-1 p-1"
            >
              {backward.map((status) => (
                <motion.button
                  key={status}
                  type="button"
                  onClick={() => handleSelectStatus(status)}
                  whileTap={{ scale: 0.92 }}
                  transition={SWIPE_BUTTON_SPRING}
                  className={cn(
                    "flex-1 flex items-center justify-center text-xs font-semibold text-white px-1 rounded-lg",
                    STATUS_PANEL_BG[status]
                  )}
                >
                  {STATUS_PANEL_LABEL[status]}
                </motion.button>
              ))}
            </motion.div>
          )}
          {forward.length > 0 && (
            <motion.div
              data-swipe-panel="right"
              style={{
                position: "fixed",
                top: restRect.top,
                height: restRect.height,
                // Mirror of the left panel: parked one panel-width right
                // of the row at rest, then slides left with the row.
                left: restRect.left + restRect.width,
                width: SWIPE_PANEL_WIDTH,
                x: rightPanelX,
                zIndex: 40,
                pointerEvents: openSide === "right" ? "auto" : "none",
              }}
              className="flex items-stretch gap-1 p-1"
            >
              {forward.map((status) => (
                <motion.button
                  key={status}
                  type="button"
                  onClick={() => handleSelectStatus(status)}
                  whileTap={{ scale: 0.92 }}
                  transition={SWIPE_BUTTON_SPRING}
                  className={cn(
                    "flex-1 flex items-center justify-center text-xs font-semibold text-white px-1 rounded-lg",
                    STATUS_PANEL_BG[status]
                  )}
                >
                  {STATUS_PANEL_LABEL[status]}
                </motion.button>
              ))}
            </motion.div>
          )}
        </Portal>
      )}
    </>
  );
});
