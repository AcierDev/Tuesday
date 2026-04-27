"use client";

import { Fragment } from "react";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Palette, Printer } from "lucide-react";
import { DayName, ScheduledOrder } from "@/typings/types";
import { OrderMeta } from "./types";
import { DraggableOrderCard } from "./DraggableOrderCard";
import { OrderCard } from "./OrderCard";
import { CapacityIndicator } from "./CapacityIndicator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DESIGN_COLOR_NAMES, DesignBlends } from "@/typings/constants";
import { ItemDesigns } from "@/typings/types";
import { cn } from "@/utils/functions";

type DayColumnOrder = ScheduledOrder & { pinned: boolean };

interface DroppableDayColumnProps {
  day: DayName;
  dateLabel: string;
  orders: DayColumnOrder[];
  ordersById: Map<string, OrderMeta>;
  totalBlocks: number;
  capacity: number;
  greenThreshold?: number;
  onTogglePin: (itemId: string, actualDay: DayName) => void;
  date: Date;
  autoPlanEnabled: boolean;
  onToggleAutoPlan: () => void;
  // Item IDs the auto-plan run just landed in any day — used to trigger a
  // one-shot "drop in" animation on those cards.
  recentlyPlacedIds?: Set<string>;
  onContextMenu?: (e: React.MouseEvent, itemId: string) => void;
}

export function DroppableDayColumn({
  day,
  dateLabel,
  orders,
  ordersById,
  totalBlocks,
  capacity,
  greenThreshold,
  onTogglePin,
  date,
  autoPlanEnabled,
  onToggleAutoPlan,
  recentlyPlacedIds,
  onContextMenu,
}: DroppableDayColumnProps) {
  const { setNodeRef } = useDroppable({
    id: day,
    data: { day, totalBlocks },
  });

  // Pinned entries always sit at the bottom of the column. Within each
  // partition the original order is preserved so manual reordering still works.
  const unpinned = orders.filter((o) => !o.pinned);
  const pinned = orders.filter((o) => o.pinned);
  const orderedIds = [...unpinned, ...pinned].map((o) => o.itemId);

  // The column's own `useDroppable.isOver` flips off whenever the cursor is
  // sitting on a card inside the column (cards register as their own
  // droppables via `useSortable`). Derive a wider "is this column the drop
  // target" from the active `over.id` instead, so the highlight and ghost
  // preview both stay on while hovering anywhere inside the column.
  const { active, over } = useDndContext();
  const overId = over?.id != null ? String(over.id) : null;
  const isTargetingThisColumn =
    !!overId &&
    (overId === day || orders.some((o) => o.itemId === overId));

  const activeId = active?.id != null ? String(active.id) : undefined;
  const activeMeta = activeId ? ordersById.get(activeId) : undefined;
  const activeAlreadyHere = activeId
    ? orders.some((o) => o.itemId === activeId)
    : false;
  const showGhost =
    isTargetingThisColumn && !!activeMeta && !activeAlreadyHere;

  // Drop position follows the cursor. When over an unpinned card, the ghost
  // slots before (cursor on top half) or after (cursor on bottom half) — so
  // the user can land on either side of any card, including the very last
  // one. Hovering over a pinned card slots the ghost at the top of unpinned;
  // column body / empty area falls through to the bottom. handleDragEnd uses
  // the same rule.
  const dropsAfterOver = (() => {
    const activeRect = active?.rect.current.translated;
    const overRect = over?.rect;
    if (!activeRect || !overRect) return false;
    return (
      activeRect.top + activeRect.height / 2 >
      overRect.top + overRect.height / 2
    );
  })();
  const ghostIdx = (() => {
    if (!showGhost) return -1;
    if (overId && overId !== day) {
      const unpinnedIdx = unpinned.findIndex((o) => o.itemId === overId);
      if (unpinnedIdx !== -1) return unpinnedIdx + (dropsAfterOver ? 1 : 0);
      if (pinned.some((o) => o.itemId === overId)) return 0;
    }
    return unpinned.length;
  })();

  // Aggregate items in this column by design and compute pieces-per-color.
  // For each design: sum total squares across all items of that design, then
  // divide by the number of colors in the design's palette — that's how many
  // pieces of each color need to be painted. Multiple items of the same
  // design fold into a single line with their squares summed first.
  const designSummary = (() => {
    const byDesign = new Map<string, { items: number; squares: number }>();
    orders.forEach((order) => {
      const meta = ordersById.get(order.itemId);
      const design = meta?.item.design?.trim();
      if (!design || !meta) return;
      const entry = byDesign.get(design) ?? { items: 0, squares: 0 };
      entry.items += 1;
      entry.squares += meta.blocks;
      byDesign.set(design, entry);
    });
    return Array.from(byDesign.entries())
      .map(([design, { items, squares }]) => {
        const colors =
          DESIGN_COLOR_NAMES[design as ItemDesigns]?.length ?? 0;
        // +10% overage for paint waste/touch-ups, rounded up so we never
        // come up short on a color.
        const piecesPerColor =
          colors > 0 ? Math.ceil((squares / colors) * 1.1) : 0;
        return { design, items, squares, colors, piecesPerColor };
      })
      .sort(
        (a, b) =>
          b.piecesPerColor - a.piecesPerColor ||
          a.design.localeCompare(b.design)
      );
  })();

  const formatPieces = (n: number) => n.toString();

  const designSwatch = (design: string) => {
    const colors = DesignBlends[design as keyof typeof DesignBlends];
    if (colors && colors.length > 0) {
      return `linear-gradient(to right, ${colors.join(", ")})`;
    }
    return "#6b7280";
  };

  // 4x6 portrait paint label. Renders the self-contained doc into a hidden
  // iframe attached to this page and prints from there — no new window/tab,
  // so popup blockers don't apply.
  const PRINT_DELAY_MS = 250;
  const PRINT_CLEANUP_MS = 1000;
  const printPaintLabel = () => {
    if (designSummary.length === 0) return;

    const escape = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const rows = designSummary
      .map(
        ({ design, items, squares, colors, piecesPerColor }) => `
          <li class="row">
            <span class="swatch" style="background:${designSwatch(design)}"></span>
            <div class="row-text">
              <div class="design">${escape(design)}</div>
              <div class="math">${items}× · ${squares} sq ÷ ${colors} colors</div>
            </div>
            <div class="amount">${
              colors > 0 ? `${escape(formatPieces(piecesPerColor))}<span class="ea">ea</span>` : "—"
            }</div>
          </li>`
      )
      .join("");

    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Paint Label — ${escape(day)}</title>
          <style>
            @page { size: 4in 6in; margin: 0; }
            html, body {
              margin: 0; padding: 0;
              width: 4in; height: 6in;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: #000; background: #fff;
            }
            .label {
              width: 100%; height: 100%;
              box-sizing: border-box;
              padding: 0.25in;
              display: flex; flex-direction: column;
            }
            .header {
              display: flex; align-items: baseline; justify-content: space-between;
              border-bottom: 2px solid #000;
              padding-bottom: 0.08in; margin-bottom: 0.12in;
            }
            .day { font-size: 28pt; font-weight: 800; line-height: 1; }
            .date { font-size: 11pt; font-weight: 600; color: #444; }
            .subtitle {
              font-size: 9pt; font-weight: 700; letter-spacing: 0.08em;
              text-transform: uppercase; color: #555; margin-bottom: 0.08in;
            }
            .overage-note {
              font-size: 6.5pt; font-weight: 500; letter-spacing: 0.02em;
              text-transform: none; color: #888; margin-left: 0.05in;
            }
            ul.rows { list-style: none; padding: 0; margin: 0; flex: 1; }
            li.row {
              display: flex; align-items: center; gap: 0.1in;
              padding: 0.06in 0;
              border-bottom: 1px solid #ddd;
            }
            li.row:last-child { border-bottom: none; }
            .swatch {
              width: 0.28in; height: 0.28in; border-radius: 999px;
              border: 1px solid rgba(0,0,0,0.2);
              flex-shrink: 0;
            }
            .row-text { flex: 1; min-width: 0; }
            .design {
              font-size: 13pt; font-weight: 700; line-height: 1.1;
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            .math { font-size: 8pt; color: #666; font-variant-numeric: tabular-nums; }
            .amount {
              font-size: 18pt; font-weight: 800; font-variant-numeric: tabular-nums;
              white-space: nowrap;
            }
            .ea { font-size: 9pt; font-weight: 600; color: #555; margin-left: 2pt; }
            @media print {
              html, body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <div class="day">${escape(day)}</div>
              <div class="date">${escape(dateLabel)}</div>
            </div>
            <div class="subtitle">
              Paint — squares per color
              <span class="overage-note">(includes +10% overage)</span>
            </div>
            <ul class="rows">${rows}</ul>
          </div>
        </body>
      </html>
    `);

    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, PRINT_CLEANUP_MS);
    }, PRINT_DELAY_MS);
  };

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-xl border transition-colors bg-gray-50/50 dark:bg-gray-900/50",
        isTargetingThisColumn ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20" : "border-transparent hover:border-gray-200 dark:hover:border-gray-800"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "p-3 pb-2 border-b border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm rounded-t-xl sticky top-0 z-10 transition-opacity duration-200",
          !autoPlanEnabled && "opacity-50"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{day}</h3>
            <span className="text-xs text-gray-500 font-medium">{dateLabel}</span>
          </div>
          <Checkbox
            checked={autoPlanEnabled}
            onCheckedChange={() => onToggleAutoPlan()}
            aria-label={`Include ${day} in auto-plan`}
            className="cursor-pointer border-gray-300 dark:border-gray-700 opacity-60 hover:opacity-100 transition-opacity data-[state=checked]:bg-gray-400 data-[state=checked]:border-gray-400 dark:data-[state=checked]:bg-gray-600 dark:data-[state=checked]:border-gray-600 data-[state=checked]:text-white"
          />
        </div>
        <CapacityIndicator
          current={totalBlocks}
          max={capacity}
          greenThreshold={greenThreshold}
        />
      </div>

      {/* List — sized to content. Items pile from the top and the auto-plan
          checkbox is pinned to the column bottom via mt-auto, so the section
          ends right at the last order. */}
      <div
        className={cn(
          "p-2 overflow-y-auto min-h-[150px] transition-opacity duration-200",
          !autoPlanEnabled && "opacity-50"
        )}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          {orders.length === 0 ? (
            showGhost && activeMeta ? (
              <div className="opacity-40 pointer-events-none mb-2.5">
                <OrderCard
                  meta={activeMeta}
                  isScheduled
                  scheduledDay={day}
                  referenceDate={date}
                />
              </div>
            ) : (
              <div
                className={cn(
                  "h-[120px] border-2 border-dashed rounded-lg m-1 transition-colors",
                  isTargetingThisColumn
                    ? "border-primary/60 bg-primary/5"
                    : "border-gray-200 dark:border-gray-800"
                )}
              />
            )
          ) : (
            <div className="space-y-2">
              {pinned.length > 0 && (
                <div className="pb-3 mb-3 border-b-2 border-dashed border-amber-300/60 dark:border-amber-700/40">
                  <div className="text-[0.625rem] uppercase tracking-wider font-semibold text-amber-600 dark:text-amber-400 px-1 pb-2 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 rounded-full bg-amber-500" />
                    Pinned
                  </div>
                  <div className="space-y-2">
                    {pinned.map((order) => {
                      const meta = ordersById.get(order.itemId);
                      if (!meta) return null;
                      return (
                        <DraggableOrderCard
                          key={order.itemId}
                          id={order.itemId}
                          meta={meta}
                          isScheduled
                          scheduledDay={day}
                          onTogglePin={() =>
                            onTogglePin(order.itemId, order.day)
                          }
                          isPinned
                          referenceDate={date}
                          onContextMenu={
                            onContextMenu
                              ? (e) => onContextMenu(e, order.itemId)
                              : undefined
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              {unpinned.map((order, idx) => {
                const meta = ordersById.get(order.itemId);
                if (!meta) return null;
                return (
                  <Fragment key={order.itemId}>
                    {showGhost && idx === ghostIdx && activeMeta && (
                      <div className="opacity-40 pointer-events-none">
                        <OrderCard
                          meta={activeMeta}
                          isScheduled
                          scheduledDay={day}
                          referenceDate={date}
                        />
                      </div>
                    )}
                    <DraggableOrderCard
                      id={order.itemId}
                      meta={meta}
                      isScheduled
                      scheduledDay={day}
                      onTogglePin={() => onTogglePin(order.itemId, order.day)}
                      isPinned={false}
                      referenceDate={date}
                      justPlaced={recentlyPlacedIds?.has(order.itemId) ?? false}
                      placeIndex={idx}
                      onContextMenu={
                        onContextMenu
                          ? (e) => onContextMenu(e, order.itemId)
                          : undefined
                      }
                    />
                  </Fragment>
                );
              })}
              {showGhost && ghostIdx === unpinned.length && activeMeta && (
                <div className="opacity-40 pointer-events-none">
                  <OrderCard
                    meta={activeMeta}
                    isScheduled
                    scheduledDay={day}
                    referenceDate={date}
                  />
                </div>
              )}
            </div>
          )}
        </SortableContext>
      </div>

      {/* Paint summary trigger. Opens a popover with per-design pieces-per-color
          and a 4×6 label print action. */}
      <div className="flex items-center justify-center px-3 py-2 border-t border-gray-100 dark:border-gray-800 rounded-b-xl">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={designSummary.length === 0}
              className="h-7 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <Palette className="mr-1.5 h-3.5 w-3.5" />
              Paint
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            side="bottom"
            className="w-60 p-3 rounded-2xl"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Paint — {day}
            </div>
            {designSummary.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                No items scheduled.
              </div>
            ) : (
              <>
                <ul className="space-y-2">
                  {designSummary.map(
                    ({ design, items, squares, colors, piecesPerColor }) => (
                      <li
                        key={design}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="h-3 w-3 shrink-0 rounded-full border border-black/10 dark:border-white/10"
                            style={{ background: designSwatch(design) }}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-gray-900 dark:text-gray-100">
                              {design}
                            </div>
                            <div className="text-[0.6875rem] text-gray-500 dark:text-gray-400 tabular-nums">
                              {items}× · {squares} sq ÷ {colors}
                            </div>
                          </div>
                        </div>
                        <span className="tabular-nums font-semibold text-gray-700 dark:text-gray-200">
                          {colors > 0 ? `${formatPieces(piecesPerColor)} ea` : "—"}
                        </span>
                      </li>
                    )
                  )}
                </ul>
                <div className="mt-3 flex justify-center">
                  <Button
                    size="sm"
                    onClick={printPaintLabel}
                    className="h-7 px-3 text-xs"
                  >
                    <Printer className="mr-1 h-3 w-3" />
                    Print
                  </Button>
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
