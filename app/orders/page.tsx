"use client";

import { useCallback, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";

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

export default function OrderManagementPage() {
  const setSearchQuery = useOrderStore((state) => state.setSearchQuery);
  const searchTerm = useOrderStore((state) => state.searchQuery);
  const [currentType, setCurrentType] = useState("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isShippingDashboardOpen, setIsShippingDashboardOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isMobile, setIsMobile] = useState(false);
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
    currentType,
  });

  useEffect(() => {
    fetch("/api/debt-snapshots", { method: "POST" }).catch(() => {});
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

  if (!orderSettingsContext) {
    return (
      <div>Error: Order settings not available. Please refresh the page.</div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-slate-50 dark:bg-slate-950 text-black dark:text-white">
      <Toaster position="top-center" />
      {!isMobile && (
        <Header
          isMobile={isMobile}
          searchTerm={searchTerm}
          onNewOrder={() => setIsNewItemModalOpen(true)}
          onSearchChange={setSearchQuery}
          currentType={currentType}
          onTypeChange={setCurrentType}
          dueCounts={dueCounts}
        />
      )}
      <div className="flex-grow">
        <div
          className={`h-full max-w-full mx-auto pr-2 ${
            isMobile ? "pl-4 pt-1" : "pl-4 sm:pl-6 lg:pl-8 py-8"
          }`}
        >
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
