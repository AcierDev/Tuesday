"use client";

import { Fragment } from "react";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Palette } from "lucide-react";
import { DayName, ScheduledOrder } from "@/typings/types";
import { OrderMeta } from "./types";
import { DraggableOrderCard } from "./DraggableOrderCard";
import { OrderCard } from "./OrderCard";
import { CapacityIndicator } from "./CapacityIndicator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { COASTAL_COLORS, DESIGN_COLOR_NAMES } from "@/typings/constants";
import { ItemDesigns } from "@/typings/types";
import { cn } from "@/utils/functions";

type DayColumnOrder = ScheduledOrder & { pinned: boolean };

interface DroppableDayColumnProps {
  day: DayName;
  dateLabel: string;
  orders: DayColumnOrder[];
  ordersById: Map<string, OrderMeta>;
  totalSquares: number;
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
  isToday?: boolean;
}

export function DroppableDayColumn({
  day,
  dateLabel,
  orders,
  ordersById,
  totalSquares,
  capacity,
  greenThreshold,
  onTogglePin,
  date,
  autoPlanEnabled,
  onToggleAutoPlan,
  recentlyPlacedIds,
  onContextMenu,
  isToday = false,
}: DroppableDayColumnProps) {
  const { setNodeRef } = useDroppable({
    id: day,
    data: { day, totalSquares },
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

  // Aggregate items in this column by design and compute squares-per-color.
  // For each design: sum total squares across all items of that design, then
  // divide by the number of colors in the design's palette — that's how many
  // squares of each color need to be painted. Multiple items of the same
  // design fold into a single line with their squares summed first.
  const designSummary = (() => {
    const byDesign = new Map<string, { items: number; squares: number }>();
    orders.forEach((order) => {
      const meta = ordersById.get(order.itemId);
      const design = meta?.item.design?.trim();
      if (!design || !meta) return;
      const entry = byDesign.get(design) ?? { items: 0, squares: 0 };
      entry.items += 1;
      entry.squares += meta.squares;
      byDesign.set(design, entry);
    });
    return Array.from(byDesign.entries())
      .map(([design, { items, squares }]) => {
        const colors =
          DESIGN_COLOR_NAMES[design as ItemDesigns]?.length ?? 0;
        // +10% overage for paint waste/touch-ups, rounded up to the next
        // even number (paint stations work squares in pairs, and rounding to
        // even keeps batches balanced).
        const squaresPerColor =
          colors > 0 ? Math.ceil(((squares / colors) * 1.1) / 2) * 2 : 0;
        return { design, items, squares, colors, squaresPerColor };
      })
      .sort(
        (a, b) =>
          b.squaresPerColor - a.squaresPerColor ||
          a.design.localeCompare(b.design)
      );
  })();

  const formatSquares = (n: number) => n.toString();

  // Per-color square totals across designs that share the Coastal palette
  // (Coastal Dream, Oceanic Harmony, Tidal — same rule as
  // ItemUtil.getPaintRequirements). Each item splits its squares evenly
  // across its own palette, totals are summed per color number, then +10%
  // overage rounded up to the next even number — the same waste/pairing
  // rule as the per-design rows. Tidal's "L1/L2/L3" string colors are
  // tracked under their own keys elsewhere and skipped here.
  //
  // The grid only earns its space when 2+ of the three shared-palette
  // designs are present that day — with a single design the per-design
  // row already says everything the painter needs.
  const COASTAL_PALETTE_DESIGNS: ItemDesigns[] = [
    ItemDesigns.Coastal,
    ItemDesigns.Oceanic_Harmony,
    ItemDesigns.Tidal,
  ];
  const COASTAL_OVERAGE_FACTOR = 1.1;
  const COASTAL_ROUND_TO = 2;
  const COASTAL_GRID_MIN_DESIGNS = 2;
  const coastalColorTotals = (() => {
    const totals = new Map<number, number>();
    const matchedDesigns = new Set<ItemDesigns>();
    orders.forEach((order) => {
      const meta = ordersById.get(order.itemId);
      const design = meta?.item.design as ItemDesigns | undefined;
      if (!meta || !design || !COASTAL_PALETTE_DESIGNS.includes(design)) return;
      const colors = DESIGN_COLOR_NAMES[design];
      if (!colors || colors.length === 0) return;
      const squaresPerColor = meta.squares / colors.length;
      colors.forEach((c) => {
        if (typeof c !== "number") return;
        totals.set(c, (totals.get(c) ?? 0) + squaresPerColor);
      });
      matchedDesigns.add(design);
    });
    if (matchedDesigns.size < COASTAL_GRID_MIN_DESIGNS) return null;
    const final = new Map<number, number>();
    totals.forEach((squares, num) => {
      final.set(
        num,
        Math.ceil((squares * COASTAL_OVERAGE_FACTOR) / COASTAL_ROUND_TO) *
          COASTAL_ROUND_TO
      );
    });
    return final;
  })();

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
      .map(({ design, items, squares, colors, squaresPerColor }) => {
        // Only shrink rows when the grid is actually rendered — with one
        // shared-palette design the row carries the per-color count alone.
        const sharesGrid =
          coastalColorTotals !== null &&
          COASTAL_PALETTE_DESIGNS.includes(design as ItemDesigns);
        return `
          <li class="row${sharesGrid ? " row-shared" : ""}">
            <div class="row-text">
              <div class="design">${escape(design)}</div>
              <div class="math">${items}× · ${squares} sq ÷ ${colors} colors</div>
            </div>
            <div class="amount">${
              colors > 0 ? `${escape(formatSquares(squaresPerColor))}<span class="ea">ea</span>` : "—"
            }</div>
          </li>`;
      })
      .join("");

    // When the day is busy (4+ designs) the per-design rows fill the page,
    // so the shared-palette grid moves to its own second 4×6 sheet — same
    // day/date header, grid scaled up to fill the page.
    const SHARED_GRID_OVERFLOW_THRESHOLD = 4;
    const shouldOverflowGrid =
      coastalColorTotals !== null &&
      designSummary.length >= SHARED_GRID_OVERFLOW_THRESHOLD;

    const colorGridSection = (mode: "inline" | "page") => {
      if (!coastalColorTotals) return "";
      const boxes = Object.keys(COASTAL_COLORS)
        .map((numStr) => {
          const num = Number(numStr);
          const count = coastalColorTotals.get(num) ?? 0;
          return `
                <div class="color-box">
                  <div class="color-num">#${num}</div>
                  <div class="color-count">${count}</div>
                </div>`;
        })
        .join("");
      return `
        <div class="color-section${
          mode === "page" ? " color-section-page" : ""
        }">
          <div class="color-section-title">Coastal palette — squares per color</div>
          <div class="color-grid">${boxes}</div>
        </div>`;
    };

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
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: #000; background: #fff;
            }
            .label {
              width: 4in; height: 6in;
              box-sizing: border-box;
              padding: 0.25in;
              display: flex; flex-direction: column;
              page-break-after: always;
              break-after: page;
            }
            .label:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            .header {
              display: flex; align-items: baseline; justify-content: space-between;
              border-bottom: 2px solid #000;
              padding-bottom: 0.08in; margin-bottom: 0.12in;
            }
            .day { font-size: 28pt; font-weight: 800; line-height: 1; color: #000; }
            .date { font-size: 11pt; font-weight: 600; color: #000; }
            .subtitle {
              font-size: 14.3pt; font-weight: 700; letter-spacing: 0.08em;
              text-transform: uppercase; color: #000; margin-bottom: 0.08in;
            }
            .overage-note {
              display: block;
              font-size: 10.45pt; font-weight: 500; letter-spacing: 0.02em;
              text-transform: none; color: #000;
              margin-top: 0.02in;
            }
            ul.rows { list-style: none; padding: 0; margin: 0; }
            li.row {
              display: flex; align-items: center; gap: 0.1in;
              padding: 0.08in 0;
              border-bottom: 1px solid #ddd;
            }
            li.row:last-child { border-bottom: none; }
            .row-text { flex: 1; min-width: 0; }
            .design {
              font-size: 20.9pt; font-weight: 700; line-height: 1.1;
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            .math { font-size: 12.65pt; color: #000; font-variant-numeric: tabular-nums; }
            .amount {
              font-size: 28.6pt; font-weight: 800; font-variant-numeric: tabular-nums;
              white-space: nowrap; color: #000;
            }
            .ea { font-size: 14.3pt; font-weight: 600; color: #000; margin-left: 2pt; }
            li.row-shared { padding: 0.04in 0; }
            li.row-shared .design { font-size: 13pt; font-weight: 700; }
            li.row-shared .math { font-size: 8.5pt; }
            li.row-shared .amount { font-size: 14pt; font-weight: 700; }
            li.row-shared .ea { font-size: 8pt; font-weight: 600; }
            .color-section {
              margin-top: 0.14in;
              padding-top: 0.1in;
              border-top: 1pt solid #000;
            }
            .color-section-title {
              font-size: 10.45pt; font-weight: 700; letter-spacing: 0.08em;
              text-transform: uppercase; color: #000;
              text-align: center;
              margin-bottom: 0.08in;
            }
            .color-grid {
              display: grid;
              grid-template-columns: repeat(5, 1fr);
              gap: 0.05in;
            }
            .color-box {
              height: 0.58in;
              border: 0.75pt solid #000;
              border-radius: 4pt;
              background: #fff;
              color: #000;
              display: flex; flex-direction: column;
              overflow: hidden;
            }
            .color-num {
              font-size: 8.5pt; font-weight: 700;
              letter-spacing: 0.04em;
              text-align: center;
              padding: 1.5pt 0;
              border-bottom: 0.5pt solid #000;
              background: #fff;
              line-height: 1;
            }
            .color-count {
              flex: 1;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 21pt; font-weight: 800;
              font-variant-numeric: tabular-nums;
              line-height: 1;
            }
            .color-section-page {
              margin-top: 0.18in;
              padding-top: 0;
              border-top: none;
            }
            .color-section-page .color-section-title {
              font-size: 12pt;
              margin-bottom: 0.12in;
            }
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
            ${shouldOverflowGrid ? "" : colorGridSection("inline")}
          </div>
          ${
            shouldOverflowGrid
              ? `
          <div class="label">
            <div class="header">
              <div class="day">${escape(day)}</div>
              <div class="date">${escape(dateLabel)}</div>
            </div>
            ${colorGridSection("page")}
          </div>`
              : ""
          }
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
        "flex flex-col rounded-xl border transition-colors",
        isToday
          ? "bg-blue-500/10 dark:bg-blue-500/15 border-blue-400/50 dark:border-blue-500/40 shadow-sm shadow-blue-500/10"
          : "bg-gray-50/50 dark:bg-gray-900/50 border-transparent hover:border-gray-200 dark:hover:border-gray-800",
        isTargetingThisColumn && "border-primary/50 bg-primary/5 ring-2 ring-primary/20"
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "p-3 pb-2 border-b backdrop-blur-sm rounded-t-xl sticky top-0 z-10 transition-opacity duration-200",
          isToday
            ? "border-blue-400/50 dark:border-blue-500/40 bg-blue-500/10 dark:bg-blue-500/15"
            : "border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50",
          !autoPlanEnabled && "opacity-50"
        )}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-baseline gap-1.5">
            <h3
              className={cn(
                "font-semibold",
                isToday
                  ? "text-blue-700 dark:text-blue-200"
                  : "text-gray-900 dark:text-gray-100"
              )}
            >
              {day}
            </h3>
            <span
              className={cn(
                "text-xs font-semibold",
                isToday
                  ? "text-blue-700/90 dark:text-blue-300"
                  : "text-gray-500 font-medium"
              )}
            >
              {dateLabel}
            </span>
          </div>
          <Checkbox
            checked={autoPlanEnabled}
            onCheckedChange={() => onToggleAutoPlan()}
            aria-label={`Include ${day} in auto-plan`}
            className="cursor-pointer h-3.5 w-3.5 border-gray-200 dark:border-gray-800 opacity-30 hover:opacity-70 transition-opacity data-[state=checked]:bg-gray-300/70 data-[state=checked]:border-gray-300/70 dark:data-[state=checked]:bg-gray-700/70 dark:data-[state=checked]:border-gray-700/70 data-[state=checked]:text-white/70 [&_svg]:h-2.5 [&_svg]:w-2.5"
          />
        </div>
        <CapacityIndicator
          current={totalSquares}
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
                  <div className="space-y-2 cursor-pin">
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

      {/* Paint button: prints the 4×6 paint label directly. */}
      <div className="flex items-center justify-center px-3 py-2 border-t border-gray-100 dark:border-gray-800 rounded-b-xl">
        <Button
          variant="ghost"
          size="sm"
          disabled={designSummary.length === 0}
          onClick={printPaintLabel}
          className="h-7 px-3 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
        >
          <Palette className="mr-1.5 h-3.5 w-3.5" />
          Paint
        </Button>
      </div>
    </div>
  );
}
