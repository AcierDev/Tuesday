"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  defaultDropAnimationSideEffects,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { useOrderStore } from "@/stores/useOrderStore";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { ColumnTitles } from "@/typings/types";
import { useOrderFiltering } from "@/hooks/useOrderFiltering";
import { ResponsiveOrdersView } from "@/components/orders/ResponsiveOrdersView";
import { isAnyModalDialogOpen } from "@/utils/dnd-modal-guard";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 ORDERS PAGE PREVIEW — cards row scheme                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// Renders the real ResponsiveOrdersView with a CSS overlay that turns each
// order row into its own rounded card tinted by the size's height tier.

const TIER_RGB: Record<string, string> = {
  "7": "6 182 212",
  "10": "16 185 129",
  "12": "245 158 11",
  "16": "244 63 94",
  // Sizes that don't parse (e.g. `18" x 24"`, `Custom`) — neutral slate.
  unknown: "100 116 139",
};

function rgb(c: string, alpha?: number) {
  return alpha == null ? `rgb(${c})` : `rgb(${c} / ${alpha})`;
}

function buildCardsCss(): string {
  // Heights 6 and 7 both fall in the cyan tier on the live page — alias them.
  // "unknown" covers any size string that doesn't parse to a WxH.
  const tiers: Array<[string, string]> = [
    ["7", TIER_RGB["7"]!],
    ["6", TIER_RGB["7"]!],
    ["10", TIER_RGB["10"]!],
    ["12", TIER_RGB["12"]!],
    ["16", TIER_RGB["16"]!],
    ["unknown", TIER_RGB["unknown"]!],
  ];

  const rules: string[] = [];
  for (const [h, c] of tiers) {
    rules.push(`
      [data-preview-variant="cards"] tr[data-h-tier="${h}"] {
        background-color: ${rgb(c, 0.32)} !important;
        background-image: none !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
      }
      [data-preview-variant="cards"] tr[data-h-tier="${h}"] > td {
        background-color: transparent !important;
        background-image: none !important;
      }
    `);
  }

  rules.push(`
    [data-preview-variant="cards"] table {
      border-collapse: separate !important;
      border-spacing: 0 6px !important;
    }
    [data-preview-variant="cards"] tr[data-h-tier] > td {
      background-color: transparent !important;
      background-image: none !important;
      border-top: 0 !important;
      border-bottom: 0 !important;
      border-color: transparent !important;
    }
    [data-preview-variant="cards"] tr[data-h-tier] > td:first-child {
      border-top-left-radius: 10px;
      border-bottom-left-radius: 10px;
    }
    [data-preview-variant="cards"] tr[data-h-tier] > td:last-child {
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
    }
    /* Cards mode adds a 6px border-spacing band above the first row and
       below the last. Pin BorderedTable's caps + bar to that same 6px so
       the colored left stripe lines up with the first / last card edges.
       Selectors target the BorderedTable wrapper structurally so the live
       page is unaffected. */
    [data-preview-variant="cards"] .relative.rounded-2xl > svg:first-of-type {
      top: 6px !important;
    }
    [data-preview-variant="cards"] .relative.rounded-2xl > svg:nth-of-type(2) {
      bottom: 6px !important;
    }
    [data-preview-variant="cards"] .relative.rounded-2xl > div.w-2 {
      top: calc(1rem + 6px) !important;
      bottom: calc(1rem + 6px) !important;
    }
  `);

  return rules.join("\n");
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🤚 DRAG SENSORS (mirror the live /orders page)                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const NO_DRAG_TAGS = new Set([
  "BUTTON",
  "A",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "LABEL",
]);

class RowMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent: event }: React.MouseEvent) => {
        if (event.button !== 0) return false;
        if (isAnyModalDialogOpen()) return false;
        let node = event.target as HTMLElement | null;
        const stop = event.currentTarget as HTMLElement;
        while (node && node !== stop) {
          if (NO_DRAG_TAGS.has(node.tagName)) return false;
          if (node.dataset?.noDnd !== undefined) return false;
          node = node.parentElement;
        }
        return true;
      },
    },
  ];
}

class GuardedTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent: event }: React.TouchEvent) => {
        if (isAnyModalDialogOpen()) return false;
        if (event.touches.length > 1) return false;
        return true;
      },
    },
  ];
}

const DROP_ANIMATION: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪟 PREVIEW                                                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const NOOP_ASYNC = async () => {};
const NOOP = () => {};

const CARDS_CSS = buildCardsCss();

export default function OrdersRedesignPreviewPage() {
  const items = useOrderStore((s) => s.items);
  const loadItems = useOrderStore((s) => s.loadItems);
  const isLoading = useOrderStore((s) => s.isLoading);
  const lastFetched = useOrderStore((s) => s.lastFetched);
  useOrderSettings();

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sortedGroups = useOrderFiltering({
    items,
    searchTerm: "",
    currentType: "all",
  });

  const sensors = useSensors(
    useSensor(RowMouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(GuardedTouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeDragItem = useMemo(() => {
    if (!activeDragId) return null;
    return items.find((i) => i.id === activeDragId) ?? null;
  }, [activeDragId, items]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((_: DragEndEvent) => {
    setActiveDragId(null);
  }, []);

  const showInitialSkeleton =
    lastFetched === null && isLoading && items.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-black dark:text-white">
      <style dangerouslySetInnerHTML={{ __html: CARDS_CSS }} />

      <div data-preview-variant="cards">
        {showInitialSkeleton ? (
          <div className="max-w-[1400px] mx-auto p-10 text-center text-sm text-gray-500">
            Loading orders…
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveDragId(null)}
          >
            <div className="h-full max-w-full mx-auto px-1 sm:px-2 py-2 sm:py-8">
              <div className="flex h-full relative">
                <div className="flex-grow min-w-0">
                  <ResponsiveOrdersView
                    groups={sortedGroups}
                    onDelete={NOOP_ASYNC}
                    onStatusChange={NOOP_ASYNC}
                    onGetLabel={NOOP}
                    onMarkCompleted={NOOP_ASYNC}
                    onShip={NOOP_ASYNC}
                    doneItems={[]}
                    loadDoneItems={NOOP_ASYNC}
                    hasMoreDoneItems={false}
                    isDoneLoading={false}
                    sortColumn={ColumnTitles.Due}
                    sortDirection={"desc"}
                    onSort={NOOP}
                    currentType={"all"}
                  />
                </div>
              </div>
            </div>
            <DragOverlay dropAnimation={DROP_ANIMATION}>
              {activeDragItem ? (
                <div className="px-3 py-2 rounded-md shadow-lg bg-white dark:bg-gray-900 text-sm font-medium border border-gray-200 dark:border-gray-700 cursor-grabbing rotate-1">
                  <div className="text-gray-900 dark:text-gray-100">
                    {activeDragItem.customerName || "Unnamed item"}
                  </div>
                  {(activeDragItem.design || activeDragItem.size) && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {[activeDragItem.design, activeDragItem.size]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
