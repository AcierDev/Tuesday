"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
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

import { Header } from "@/components/orders/Header";
import { NewItemModal } from "@/components/orders/NewItemModal";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useOrderSettings } from "@/contexts/OrderSettingsContext";
import {
  Item,
  ItemStatus,
  ItemSizes,
  ItemDesigns,
  ColumnTitles,
} from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { ShippingDashboard } from "@/components/shipping/ShippingDashboard";
import { useOrderFiltering } from "@/hooks/useOrderFiltering";
import { useOrderStats } from "@/hooks/useOrderStats";
import { useAutoPromoteByDueDate } from "@/hooks/useAutoPromoteByDueDate";
import { ResponsiveOrdersView } from "@/components/orders/ResponsiveOrdersView";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎯 STATUS DROP TARGETS                                               ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const VALID_DROP_STATUSES = new Set<string>([
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
  ItemStatus.Hidden,
]);

const DROP_ANIMATION: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.5" } },
  }),
};

export default function OrderManagementPage() {
  const setSearchQuery = useOrderStore((state) => state.setSearchQuery);
  const searchTerm = useOrderStore((state) => state.searchQuery);
  const [currentType, setCurrentType] = useState("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isShippingDashboardOpen, setIsShippingDashboardOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [itemToComplete, setItemToComplete] = useState<string | null>(null);

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

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // One-shot scroll to bottom on initial load. Wait until items are loaded so
  // the document has its full height; rAF ensures layout is committed first.
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (items.length === 0) return;
    didInitialScrollRef.current = true;
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.documentElement.scrollHeight });
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

  const dueCounts = useOrderStats({
    items,
    dueBadgeDays: settings.dueBadgeDays,
  });

  const sortedGroups = useOrderFiltering({
    items,
    searchTerm,
    currentType,
  });

  useEffect(() => {
    fetch("/api/debt-snapshots", { method: "POST" }).catch(() => {});
    fetch("/api/backlog-snapshots", { method: "POST" }).catch(() => {});
  }, []);

  const shipItem = useCallback(async (itemId: string) => {
    toast.success("Item marked as shipped", {
      style: { background: "#10B981", color: "white" },
    });
  }, []);

  const markItemCompleted = useCallback(async (itemId: string) => {
    setItemToComplete(itemId);
    setIsConfirmationOpen(true);
  }, []);

  const handleConfirmComplete = useCallback(async () => {
    if (!itemToComplete) return;

    try {
      const itemToUpdate = items.find((item) => item.id === itemToComplete);
      if (!itemToUpdate) {
        throw new Error("Item not found");
      }

      const updatedItem = {
        ...itemToUpdate,
        previousStatus: itemToUpdate.status,
        status: ItemStatus.Done,
        completedAt: Date.now(),
      };

      await updateItem(updatedItem);

      toast.success("Item marked as completed", {
        style: { background: "#10B981", color: "white" },
      });
    } catch (error) {
      toast.error("Failed to mark item as completed", {
        style: { background: "#EF4444", color: "white" },
      });
    } finally {
      setIsConfirmationOpen(false);
      setItemToComplete(null);
    }
  }, [items, updateItem, itemToComplete]);

  const onGetLabel = useCallback((item: Item) => {
    setSelectedItem(item);
    setIsShippingDashboardOpen(true);
  }, []);

  const getStatusChangeMessage = (newStatus: ItemStatus) => {
    switch (newStatus) {
      case ItemStatus.New:
        return "Item added to New orders";
      case ItemStatus.OnDeck:
        return "Item moved to On Deck - ready to start";
      case ItemStatus.Wip:
        return "Item moved to Work in Progress";
      case ItemStatus.Packaging:
        return "Item ready for packaging";
      case ItemStatus.At_The_Door:
        return "Item is at the door - ready for pickup";
      case ItemStatus.Done:
        return "Item marked as completed";
      case ItemStatus.Hidden:
        return "Item hidden from view";
      default:
        return `Item moved to ${newStatus}`;
    }
  };

  const undoStatusChange = useCallback(
    async (item: Item, previousStatus: ItemStatus) => {
      try {
        const restoredItem = {
          ...item,
          status: previousStatus,
          prevStatus: null,
          completedAt: undefined,
        };

        await updateItem(restoredItem);

      } catch (error) {
        console.error("Failed to undo status change:", error);
        toast.error("Failed to undo status change", {
          style: { background: "#EF4444", color: "white" },
        });
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
        const previousStatus = item.status;
        const updatedItem = {
          ...item,
          status: newStatus,
          prevStatus: null,
          completedAt: newStatus === ItemStatus.Done ? Date.now() : undefined,
        };

        await updateItem(updatedItem);

        toast.success(getStatusChangeMessage(newStatus), {
          style: { background: "#10B981", color: "white" },
          action: {
            label: "Undo",
            onClick: () => undoStatusChange(item, previousStatus),
          },
        });
      } catch (error) {
        console.error("Failed to update status:", error);
        toast.error("Failed to update status");
      }
    },
    [items, doneItems, updateItem, undoStatusChange]
  );

  const undoItemDeletion = useCallback(
    async (item: Item) => {
      try {
        const restoredItem = {
          ...item,
          deleted: false,
        };
        await updateItem(restoredItem);

        toast.success("Item restored");
      } catch (error) {
        console.error("Failed to restore item:", error);
        toast.error("Failed to restore item", {
          style: { background: "#EF4444", color: "white" },
        });
      }
    },
    [updateItem]
  );

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      try {
        const itemToDelete = items.find((item) => item.id === itemId);
        if (!itemToDelete) {
          return;
        }

        await deleteItem(itemId);

        toast.success("Item deleted", {
          style: { background: "#10B981", color: "white" },
          action: {
            label: "Undo",
            onClick: () => undoItemDeletion(itemToDelete),
          },
        });
      } catch (error) {
        toast.error("Failed to delete item", {
          style: { background: "#EF4444", color: "white" },
        });
      }
    },
    [items, deleteItem, undoItemDeletion]
  );

  const handleAddNewItem = async (newItem: Partial<Item>) => {
    try {
      const createdItem = await addNewItem(newItem);

    } catch (error) {
      console.error("Failed to add new item:", error);
      toast.error("Failed to add new item", {
        style: { background: "#EF4444", color: "white" },
      });
    }
  };

  //╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
  //║ 🤚 DRAG-AND-DROP STATUS REASSIGNMENT                                 ║
  //╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 5 },
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
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-950 text-black dark:text-white">
      <Toaster position="top-center" />
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
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveDragId(null)}
      >
        <div className="flex-grow">
          <div className="h-full max-w-full mx-auto px-1 sm:pr-2 sm:pl-4 md:pl-6 lg:pl-8 py-2 sm:py-8 pb-24 md:pb-8">
            <div className="flex h-full relative">
              <div
                className="flex-grow min-w-0"
                style={{ contain: "paint" }}
              >
                <ResponsiveOrdersView
                  groups={sortedGroups}
                  onDelete={handleDeleteItem}
                  onStatusChange={handleStatusChange}
                  onGetLabel={onGetLabel}
                  onMarkCompleted={markItemCompleted}
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
      <Dialog
        open={isShippingDashboardOpen}
        onOpenChange={setIsShippingDashboardOpen}
      >
        <DialogContent className="max-w-4xl max-h-[90vh]">
          {selectedItem && (
            <ShippingDashboard
              item={selectedItem}
              onClose={() => {
                setIsShippingDashboardOpen(false);
                setSelectedItem(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="grid gap-4 py-4">
            <h2 className="text-lg font-semibold">Confirm Completion</h2>
            <p>Are you sure you'd like to mark this item as done?</p>
            <div className="flex justify-end gap-3">
              <Button onClick={handleConfirmComplete}>Yes</Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsConfirmationOpen(false);
                  setItemToComplete(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
