"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Toaster, toast } from "sonner";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Header } from "@/components/orders/Header";
import { NewItemModal } from "@/components/orders/NewItemModal";
import { WeeklySchedule } from "@/components/weekly-schedule/WeeklySchedule";
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
  DayName,
} from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";
import { ShippingDashboard } from "@/components/shipping/ShippingDashboard";
import { cn } from "@/utils/functions";
import { useActivities } from "@/hooks/useActivities";
import { useOrderFiltering } from "@/hooks/useOrderFiltering";
import { useOrderStats } from "@/hooks/useOrderStats";
import { ResponsiveOrdersView } from "@/components/orders/ResponsiveOrdersView";

export default function OrderManagementPage() {
  const setSearchQuery = useOrderStore((state) => state.setSearchQuery);
  const searchTerm = useOrderStore((state) => state.searchQuery);
  const [currentMode, setCurrentMode] = useState("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isShippingDashboardOpen, setIsShippingDashboardOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isWeeklyPlannerOpen, setIsWeeklyPlannerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [itemToComplete, setItemToComplete] = useState<string | null>(null);
  const { addItemToDay } = useWeeklyScheduleStore();
  const [clickToAddTarget, setClickToAddTarget] = useState<{
    day: DayName;
    weekKey: string;
  } | null>(null);

  const handleStartClickToAdd = useCallback((day: DayName, weekKey: string) => {
    if (weekKey === "") {
      setClickToAddTarget(null);
      return;
    }
    // If clicking the same day, toggle off
    setClickToAddTarget((prev) => {
      if (prev?.day === day && prev?.weekKey === weekKey) {
        return null;
      }
      return { day, weekKey };
    });
  }, []);

  const handleCancelClickToAdd = useCallback(() => {
    setClickToAddTarget(null);
  }, []);

  const handleItemClick = useCallback(
    async (item: Item) => {
      if (!clickToAddTarget) return;

      try {
        await addItemToDay(
          clickToAddTarget.weekKey,
          clickToAddTarget.day,
          item.id
        );
        toast.success(`Added ${item.customerName} to ${clickToAddTarget.day}`);
      } catch (error) {
        toast.error("Failed to add item to schedule");
      }
    },
    [clickToAddTarget, addItemToDay]
  );

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

  const { logActivity } = useActivities();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const dueCounts = useOrderStats({
    items,
    dueBadgeDays: settings.dueBadgeDays,
  });

  const sortedGroups = useOrderFiltering({
    items,
    searchTerm,
    currentMode,
    groupingField: settings.groupingField,
    showCompletedOrders: settings.showCompletedOrders,
  });

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

      await logActivity(
        itemToUpdate.id!,
        "status_change",
        [
          {
            field: "status",
            oldValue: itemToUpdate.status,
            newValue: ItemStatus.Done,
          },
        ],
        {
          customerName: itemToUpdate.customerName,
          design: itemToUpdate.design,
          size: itemToUpdate.size,
        }
      );

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
          completedAt: undefined,
        };

        await updateItem(restoredItem);

        await logActivity(
          item.id!,
          "status_change",
          [
            {
              field: "status",
              oldValue: item.status,
              newValue: previousStatus,
              isRestore: true,
            },
          ],
          {
            customerName: item.customerName,
            design: item.design,
            size: item.size,
          }
        );
      } catch (error) {
        console.error("Failed to undo status change:", error);
        toast.error("Failed to undo status change", {
          style: { background: "#EF4444", color: "white" },
        });
      }
    },
    [updateItem, logActivity]
  );

  const handleStatusChange = useCallback(
    async (itemId: string, newStatus: ItemStatus) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      if (item.status === newStatus) return;

      try {
        const previousStatus = item.status;
        const updatedItem = {
          ...item,
          status: newStatus,
          completedAt: newStatus === ItemStatus.Done ? Date.now() : undefined,
        };

        await updateItem(updatedItem);

        await logActivity(
          item.id!,
          "status_change",
          [
            {
              field: "status",
              oldValue: previousStatus,
              newValue: newStatus,
            },
          ],
          {
            customerName: item.customerName,
            design: item.design,
            size: item.size,
          }
        );

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
    [items, updateItem, logActivity, undoStatusChange]
  );

  const undoItemDeletion = useCallback(
    async (item: Item) => {
      try {
        const restoredItem = {
          ...item,
          deleted: false,
        };
        await updateItem(restoredItem);

        await logActivity(
          item.id,
          "restore",
          [
            {
              field: "deleted",
              oldValue: "true",
              newValue: "false",
              isRestore: true,
            },
          ],
          {
            customerName: item.customerName,
            design: item.design,
            size: item.size,
          }
        );

        toast.success("Item restored");
      } catch (error) {
        console.error("Failed to restore item:", error);
        toast.error("Failed to restore item", {
          style: { background: "#EF4444", color: "white" },
        });
      }
    },
    [updateItem, logActivity]
  );

  const handleDeleteItem = useCallback(
    async (itemId: string) => {
      try {
        const itemToDelete = items.find((item) => item.id === itemId);
        if (!itemToDelete) {
          return;
        }

        await deleteItem(itemId);

        // Log the deletion
        await logActivity(
          itemId,
          "delete",
          [
            {
              field: "deleted",
              oldValue: "false",
              newValue: "true",
            },
          ],
          {
            customerName: itemToDelete.customerName,
            design: itemToDelete.design,
            size: itemToDelete.size,
          }
        );

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

  useEffect(() => {
    if (isWeeklyPlannerOpen) {
      const event = new CustomEvent("weeklyScheduleUpdate");
      window.dispatchEvent(event);
    }
  }, [isWeeklyPlannerOpen]);

  const handleAddNewItem = async (newItem: Partial<Item>) => {
    try {
      const createdItem = await addNewItem(newItem);

      if (createdItem?.id) {
        await logActivity(
          createdItem.id,
          "create",
          [
            {
              field: "status",
              oldValue: "",
              newValue: ItemStatus.New,
            },
          ],
          {
            customerName: createdItem.customerName,
            design: createdItem.design,
            size: createdItem.size,
          }
        );
      }
    } catch (error) {
      console.error("Failed to add new item:", error);
      toast.error("Failed to add new item", {
        style: { background: "#EF4444", color: "white" },
      });
    }
  };

  if (!orderSettingsContext) {
    return (
      <div>Error: Order settings not available. Please refresh the page.</div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-white dark:bg-gray-900 text-black dark:text-white">
      <Toaster position="top-center" />
      {!isMobile && (
        <Header
          isMobile={isMobile}
          searchTerm={searchTerm}
          onNewOrder={() => setIsNewItemModalOpen(true)}
          onSearchChange={setSearchQuery}
          currentMode={currentMode}
          onModeChange={setCurrentMode}
          dueCounts={dueCounts}
        />
      )}
      <div className="flex-grow">
        <div
          className={`h-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 ${
            isMobile ? "pt-1" : "py-8"
          }`}
        >
          <div className="flex h-full relative">
            <div
              className={cn(
                "flex-grow transition-all duration-300 ease-in-out min-w-0",
                isWeeklyPlannerOpen ? "pr-80" : ""
              )}
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
                clickToAddTarget={clickToAddTarget}
                onItemClick={handleItemClick}
              />
            </div>
            <div
              className={cn(
                "fixed top-[5.5rem] right-0 h-[calc(100vh-5.5rem)] transition-all duration-300 ease-in-out",
                isWeeklyPlannerOpen
                  ? "w-96 translate-x-0"
                  : "w-0 translate-x-full"
              )}
            >
              {items && isWeeklyPlannerOpen && (
                <div className="h-full bg-white dark:bg-transparent shadow-lg rounded-l-lg">
                  <WeeklySchedule
                    onStartClickToAdd={handleStartClickToAdd}
                    clickToAddTarget={clickToAddTarget}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Button
        className="fixed top-1/2 right-0 transform -translate-y-1/2 bg-white dark:bg-gray-800 shadow-md rounded-l-md p-2 z-10"
        variant="ghost"
        onClick={() => setIsWeeklyPlannerOpen(!isWeeklyPlannerOpen)}
        aria-label={
          isWeeklyPlannerOpen ? "Close weekly planner" : "Open weekly planner"
        }
      >
        {isWeeklyPlannerOpen ? (
          <ChevronRight className="h-6 w-6" />
        ) : (
          <ChevronLeft className="h-6 w-6" />
        )}
      </Button>
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
