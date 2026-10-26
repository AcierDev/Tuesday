"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  defaultDropAnimationSideEffects,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

import { Header } from "@/components/orders/Header";
import { NewItemModal } from "@/components/orders/NewItemModal";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { showErrorToast, showToast } from "@/components/ui/app-toast";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import { isAnyModalDialogOpen } from "@/utils/dnd-modal-guard";
import {
  Item,
  ItemStatus,
  ColumnTitles,
} from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useOrderFiltering } from "@/hooks/useOrderFiltering";
import { useOrderStats } from "@/hooks/useOrderStats";
import { useAutoPromoteByDueDate } from "@/hooks/useAutoPromoteByDueDate";
import { ResponsiveOrdersView } from "@/components/orders/ResponsiveOrdersView";
import {
  buildStatusMove,
  buildStatusUndo,
} from "@/components/orders/utils/statusMove";
import { findScrollContainer } from "@/components/orders/utils/scrollContainer";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎯 STATUS DROP TARGETS                                               ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const VALID_DROP_STATUSES = new Set<string>([
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
]);

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚫 NO-DRAG ZONES                                                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// The whole row is the drag source — but pointer-down on an interactive
// child element (badges that open editors, the action menu trigger, form
// inputs, links) shouldn't start a drag. Subclassing MouseSensor lets us
// reject activation cleanly at the source instead of stopPropagation in N
// cell components. Match descendants only — useDraggable puts
// role="button" on the row itself, so role-based selectors would
// self-veto.
const NO_DRAG_TAGS = new Set([
  "BUTTON",
  "A",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "LABEL",
]);

// Walks from the pressed element up to the row (the activator node).
function startsOnNoDragTarget(target: EventTarget | null, row: EventTarget) {
  let node = target as HTMLElement | null;
  while (node && node !== row) {
    if (NO_DRAG_TAGS.has(node.tagName)) return true;
    if (node.dataset?.noDnd !== undefined) return true;
    node = node.parentElement;
  }
  return false;
}

class RowMouseSensor extends MouseSensor {
  static activators = [
    {
      eventName: "onMouseDown" as const,
      handler: ({ nativeEvent: event, currentTarget }: React.MouseEvent) => {
        if (event.button !== 0) return false;
        if (isAnyModalDialogOpen()) return false;
        return !startsOnNoDragTarget(event.target, currentTarget);
      },
    },
  ];
}

// Same no-drag zones as the mouse, so tapping a badge, the ⋮ menu or an input
// on a tablet never starts a drag.
class GuardedTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent: event, currentTarget }: React.TouchEvent) => {
        if (isAnyModalDialogOpen()) return false;
        if (event.touches.length > 1) return false;
        return !startsOnNoDragTarget(event.target, currentTarget);
      },
    },
  ];
}

// Pointer drags drop on the section under the pointer. Keyboard drags have no
// pointer, so fall back to the section header nearest the dragged overlay.
const statusCollisionDetection: CollisionDetection = (args) =>
  args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);

const MOUSE_DRAG_DISTANCE_PX = 6;
// Press-and-hold before a touch drag starts: long enough that taps and
// scroll flicks never pick a row up.
const TOUCH_DRAG_DELAY_MS = 275;
const TOUCH_DRAG_TOLERANCE_PX = 5;

const DROP_ANIMATION: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

const SKELETON_ROW_COUNT = 4;

function InitialOrdersSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 3 }).map((_, sectionIdx) => (
        <div key={`skeleton-section-${sectionIdx}`} className="space-y-2">
          <Skeleton className="h-10 w-48 rounded-md" />
          <div className="space-y-2 px-2">
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, rowIdx) => (
              <Skeleton
                key={`skeleton-row-${sectionIdx}-${rowIdx}`}
                className="h-10 w-full rounded-md"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function OrderManagementPage() {
  const setSearchQuery = useOrderStore((state) => state.setSearchQuery);
  const searchTerm = useOrderStore((state) => state.searchQuery);
  const [currentType, setCurrentType] = useState("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const orderSettingsContext = useOrderSettings();
  const settings = orderSettingsContext.settings || {};
  const updateSettings = orderSettingsContext.updateSettings || (() => {});

  const items = useOrderStore((state) => state.items);
  const doneItems = useOrderStore((state) => state.doneItems);
  const loadDoneItems = useOrderStore((state) => state.loadDoneItems);
  const hasMoreDoneItems = useOrderStore((state) => state.hasMoreDoneItems);
  const isDoneLoading = useOrderStore((state) => state.isDoneLoading);
  const updateItem = useOrderStore((state) => state.updateItem);
  const addNewItem = useOrderStore((state) => state.addNewItem);
  const deleteItem = useOrderStore((state) => state.deleteItem);
  const loadItems = useOrderStore((state) => state.loadItems);
  const isLoading = useOrderStore((state) => state.isLoading);
  const lastFetched = useOrderStore((state) => state.lastFetched);
  // First-paint skeleton: show only on the very first load (lastFetched is
  // null until the initial fetch resolves). Subsequent refreshes keep the
  // existing UI visible to avoid layout flashing.
  const showInitialSkeleton =
    lastFetched === null && isLoading && items.length === 0;

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // One-shot scroll to bottom on initial load. Wait until items are loaded so
  // the page has its full height; rAF ensures layout is committed first. The
  // app shell scrolls an inner container, not the window.
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (items.length === 0) return;
    didInitialScrollRef.current = true;
    requestAnimationFrame(() => {
      const scroller = findScrollContainer(pageRef.current);
      scroller?.scrollTo({ top: scroller.scrollHeight });
    });
  }, [items.length]);

  useAutoPromoteByDueDate(items);

  const [sortColumn, setSortColumn] = useState<ColumnTitles | null>(
    ColumnTitles.Due
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    "desc"
  );

  const handleSort = useCallback(
    (column: ColumnTitles) => {
      if (sortColumn === column) {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else if (sortDirection === "desc") {
          setSortDirection(null);
          setSortColumn(null);
        } else {
          setSortDirection("asc");
        }
      } else {
        setSortColumn(column);
        setSortDirection("asc");
      }
    },
    [sortColumn, sortDirection]
  );

  const dueCounts = useOrderStats({ items });

  const sortedGroups = useOrderFiltering({
    items,
    searchTerm,
    currentType,
  });

  useEffect(() => {
    fetch("/api/debt-snapshots", { method: "POST" }).catch(() => {});
    fetch("/api/backlog-snapshots", { method: "POST" }).catch(() => {});
  }, []);

  const shipItem = useCallback(async (_itemId: string) => {}, []);

  // Undo puts the moved fields back on the latest copy of the order.
  const undoStatusMove = useCallback(
    async (original: Item) => {
      const { items: liveItems, doneItems: liveDone } =
        useOrderStore.getState();
      const current =
        liveItems.find((i) => i.id === original.id) ??
        liveDone.find((i) => i.id === original.id) ??
        original;
      try {
        await updateItem(buildStatusUndo(current, original));
      } catch (error) {
        console.error("Failed to undo status move:", error);
        showErrorToast("Couldn't undo the move. Try again.");
      }
    },
    [updateItem]
  );

  const handleStatusChange = useCallback(
    async (itemId: string, newStatus: ItemStatus) => {
      const item =
        items.find((i) => i.id === itemId) ??
        doneItems.find((i) => i.id === itemId);
      if (!item) return;

      if (item.status === newStatus) return;

      try {
        await updateItem(buildStatusMove(item, newStatus));
      } catch (error) {
        console.error("Failed to update status:", error);
        showErrorToast(`Couldn't move to ${newStatus}. Try again.`);
        return;
      }
      showToast({
        message: `Moved to ${newStatus}`,
        action: { label: "Undo", onClick: () => void undoStatusMove(item) },
      });
    },
    [items, doneItems, updateItem, undoStatusMove]
  );

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      const name =
        items.find((i) => i.id === itemId)?.customerName ||
        doneItems.find((i) => i.id === itemId)?.customerName ||
        "Order";
      try {
        await deleteItem(itemId);
        // A delete that silently failed leaves the order in the store.
        const { items: liveItems, doneItems: liveDone } =
          useOrderStore.getState();
        if (
          liveItems.some((i) => i.id === itemId) ||
          liveDone.some((i) => i.id === itemId)
        ) {
          throw new Error("Order is still listed after delete");
        }
      } catch (error) {
        console.error("Failed to delete item:", error);
        showErrorToast(`Couldn't delete "${name}". Try again.`);
        return;
      }
      showToast({
        message: `"${name}" moved to deleted`,
        action: { label: "View", href: "/deleted" },
      });
    },
    [deleteItem, items, doneItems]
  );

  // Rethrow so OrderFormDialog keeps the form open, shows the error, and only
  // notifies the team after a confirmed create.
  const handleAddNewItem = useCallback(
    async (newItem: Partial<Item>) => {
      try {
        await addNewItem(newItem);
      } catch (error) {
        console.error("Failed to add new item:", error);
        throw error;
      }
    },
    [addNewItem]
  );

  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 🤚 DRAG-AND-DROP STATUS REASSIGNMENT                                 ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(RowMouseSensor, {
      activationConstraint: { distance: MOUSE_DRAG_DISTANCE_PX },
    }),
    useSensor(GuardedTouchSensor, {
      activationConstraint: {
        delay: TOUCH_DRAG_DELAY_MS,
        tolerance: TOUCH_DRAG_TOLERANCE_PX,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeDragItem = useMemo(() => {
    if (!activeDragId) return null;
    return (
      items.find((i) => i.id === activeDragId) ??
      doneItems.find((i) => i.id === activeDragId) ??
      null
    );
  }, [activeDragId, items, doneItems]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over) return;
      const itemId = String(active.id);
      const overId = String(over.id);
      if (!VALID_DROP_STATUSES.has(overId)) return;
      void handleStatusChange(itemId, overId as ItemStatus);
    },
    [handleStatusChange]
  );

  if (!orderSettingsContext) {
    return (
      <div>Error: Order settings not available. Please refresh the page.</div>
    );
  }

  return (
    <div
      ref={pageRef}
      className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-950 text-black dark:text-white"
    >
      <Header
        searchTerm={searchTerm}
        onNewOrder={() => setIsNewItemModalOpen(true)}
        onSearchChange={setSearchQuery}
        currentType={currentType}
        onTypeChange={setCurrentType}
        dueCounts={dueCounts}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={statusCollisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        <div className="flex-grow">
          <div className="h-full max-w-full mx-auto px-1 sm:px-2 py-2 sm:py-8 pb-[calc(10rem+env(safe-area-inset-bottom))] md:pb-8">
            <div className="flex h-full relative">
              <div
                className="flex-grow min-w-0"
                style={{ contain: "paint" }}
              >
                {showInitialSkeleton ? (
                  <InitialOrdersSkeleton />
                ) : (
                  <ResponsiveOrdersView
                    groups={sortedGroups}
                    onDelete={handleDeleteItem}
                    onStatusChange={handleStatusChange}
                    onShip={shipItem}
                    doneItems={doneItems}
                    loadDoneItems={loadDoneItems}
                    hasMoreDoneItems={hasMoreDoneItems}
                    isDoneLoading={isDoneLoading}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    currentType={currentType}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <DragOverlay dropAnimation={DROP_ANIMATION}>
          {activeDragItem ? (
            <div className="px-3 py-2 rounded-md shadow-lg glass-surface text-sm font-medium border border-gray-200 dark:border-gray-700 cursor-grabbing rotate-1">
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
      {isSettingsOpen && (
        <SettingsPanel
          settings={settings}
          updateSettings={updateSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
      <NewItemModal
        isOpen={isNewItemModalOpen}
        onClose={() => setIsNewItemModalOpen(false)}
        onSubmit={handleAddNewItem}
      />
    </div>
  );
}
