"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Toaster, toast } from "sonner";
import { DropResult, ResponderProvided } from "@hello-pangea/dnd";
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
} from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { ShippingDashboard } from "@/components/shipping/ShippingDashboard";
import { cn } from "@/utils/functions";
import { useActivities } from "@/hooks/useActivities";
import { ResponsiveOrdersView } from "@/components/orders/ResponsiveOrdersView";

export default function OrderManagementPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentMode, setCurrentMode] = useState("all");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isShippingDashboardOpen, setIsShippingDashboardOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isWeeklyPlannerOpen, setIsWeeklyPlannerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [itemToComplete, setItemToComplete] = useState<string | null>(null);

  const orderSettingsContext = useOrderSettings();
  const settings = orderSettingsContext.settings || {};
  const updateSettings = orderSettingsContext.updateSettings || (() => {});

  const { items, updateItem, addNewItem, deleteItem, reorderItems } =
    useOrderStore();

  const { logActivity } = useActivities();

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const isItemDue = useCallback(
    (item: Item) => {
      const dueDate = item.values[item.values.length - 1]?.text;
      if (!dueDate) return false;

      const dueDateObj = new Date(dueDate);
      const currentDate = new Date();
      const daysDifference = Math.abs(
        Math.ceil(
          (dueDateObj.getTime() - currentDate.getTime()) / (1000 * 3600 * 24)
        )
      );

      return daysDifference <= settings.dueBadgeDays;
    },
    [settings.dueBadgeDays]
  );

  const dueCounts = useMemo(() => {
    if (!items) return {};

    const counts: Record<string, number> = {
      all: 0,
      geometric: 0,
      striped: 0,
      tiled: 0,
      mini: 0,
      custom: 0,
    };

    items.forEach((item) => {
      if (isItemDue(item)) {
        counts.all = (counts.all || 0) + 1;

        const design =
          item.values.find((v) => v.columnName === "Design")?.text || "";
        const size =
          item.values.find((v) => v.columnName === "Size")?.text || "";

        const isMini = size === ItemSizes.Fourteen_By_Seven;

        if (design.startsWith("Striped") && !isMini)
          counts.striped = (counts.striped || 0) + 1;
        else if (design.startsWith("Tiled") && !isMini)
          counts.tiled = (counts.tiled || 0) + 1;
        else if (
          !design.startsWith("Striped") &&
          !isMini &&
          !design.startsWith("Tiled")
        )
          counts.geometric = (counts.geometric || 0) + 1;

        if (isMini) counts.mini = (counts.mini || 0) + 1;
        if (!Object.values(ItemDesigns).includes(design as ItemDesigns))
          counts.custom = (counts.custom || 0) + 1;
      }
    });

    return counts;
  }, [items, isItemDue]);

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
          customerName: itemToUpdate.values?.find(
            (v) => v.columnName === ColumnTitles.Customer_Name
          )?.text,
          design: itemToUpdate.values?.find(
            (v) => v.columnName === ColumnTitles.Design
          )?.text,
          size: itemToUpdate.values?.find(
            (v) => v.columnName === ColumnTitles.Size
          )?.text,
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
      case ItemStatus.Shipping:
        return "Item moved to Shipping";
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
            customerName: item.values?.find(
              (v) => v.columnName === ColumnTitles.Customer_Name
            )?.text,
            design: item.values?.find(
              (v) => v.columnName === ColumnTitles.Design
            )?.text,
            size: item.values?.find((v) => v.columnName === ColumnTitles.Size)
              ?.text,
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

  const onDragEnd = useCallback(
    async (result: DropResult, provided: ResponderProvided) => {
      const { source, destination, draggableId } = result;

      // Add more detailed logging
      console.log("Drag operation started with:", {
        source,
        destination,
        draggableId,
        itemsLength: items?.length,
      });

      if (!destination || !items || !draggableId) {
        console.warn(
          "Drag ended without valid destination/items/draggableId:",
          { destination, itemsLength: items?.length, draggableId }
        );
        return;
      }

      const movedItem = items.find(
        (item) => item.id && item.id.toString() === draggableId
      );

      if (!movedItem) {
        console.error("Could not find item with id:", draggableId);
        return;
      }

      // Skip if dropped in same location
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        console.debug("Item dropped in same location, skipping update");
        return;
      }

      const sourceStatus = source.droppableId as ItemStatus;
      const newStatus = destination.droppableId as ItemStatus;
      const statusChanged = sourceStatus !== newStatus;

      console.log("Processing drag with:", {
        sourceStatus,
        newStatus,
        statusChanged,
        destinationIndex: destination.index,
        itemId: movedItem.id,
      });

      try {
        const originalStatus = movedItem.status;

        // This will handle both reordering and status changes
        await reorderItems(
          movedItem.id,
          sourceStatus,
          newStatus,
          destination.index
        );

        console.log("Successfully reordered items");

        if (statusChanged) {
          await logActivity(
            movedItem.id!,
            "status_change",
            [
              {
                field: "status",
                oldValue: originalStatus,
                newValue: newStatus,
              },
            ],
            {
              customerName: movedItem.values?.find(
                (v) => v.columnName === ColumnTitles.Customer_Name
              )?.text,
              design: movedItem.values?.find(
                (v) => v.columnName === ColumnTitles.Design
              )?.text,
              size: movedItem.values?.find(
                (v) => v.columnName === ColumnTitles.Size
              )?.text,
            }
          );

          console.debug("Logged status change activity.");

          toast.success(getStatusChangeMessage(newStatus), {
            style: { background: "#10B981", color: "white" },
            action: {
              label: "Undo",
              onClick: () => undoStatusChange(movedItem, originalStatus),
            },
          });
        }
      } catch (error) {
        console.error("Failed to update item status:", error);
        toast.error("Failed to update item status. Please try again.", {
          style: { background: "#EF4444", color: "white" },
        });
      }
    },
    [items, reorderItems, undoStatusChange, logActivity]
  );

  const filteredGroups = useMemo(() => {
    if (!items) return [];

    let groupValues: string[] = Object.values(ItemStatus);

    const groups = groupValues.map((value) => ({
      id: value,
      title: value,
      items: [] as Item[],
    }));

    const matchedSearch = items.filter((item) =>
      item.values.some((value) =>
        String(value.text || "")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
    );

    matchedSearch.forEach((item) => {
      const group = groups.find((g) => g.title === item.status);
      if (group) {
        const design =
          item.values.find((v) => v.columnName === "Design")?.text || "";
        const size =
          item.values.find((v) => v.columnName === "Size")?.text || "";

        const isMini = size === ItemSizes.Fourteen_By_Seven;

        const shouldInclude = (() => {
          switch (currentMode) {
            case "all":
              return true;
            case "striped":
              return design.startsWith("Striped") && !isMini;
            case "tiled":
              return design.startsWith("Tiled") && !isMini;
            case "geometric":
              return (
                !design.startsWith("Striped") &&
                !design.startsWith("Tiled") &&
                !isMini
              );
            case "mini":
              return isMini;
            case "custom":
              return (
                !Object.values(ItemDesigns).includes(design as ItemDesigns) &&
                !isMini
              );
            default:
              return false;
          }
        })();

        if (shouldInclude) {
          group.items.push(item);
        }
      }
    });

    return groups;
  }, [
    items,
    settings.groupingField,
    settings.showCompletedOrders,
    searchTerm,
    currentMode,
  ]);

  const sortedGroups = useMemo(() => {
    return [...filteredGroups].sort((a, b) => {
      if (settings.groupingField === "Status") {
        const aIndex = Object.values(ItemStatus).indexOf(a.title as ItemStatus);
        const bIndex = Object.values(ItemStatus).indexOf(b.title as ItemStatus);
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      }
      return a.title.localeCompare(b.title);
    });
  }, [filteredGroups, settings.groupingField]);

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
            customerName: item.values?.find(
              (v) => v.columnName === ColumnTitles.Customer_Name
            )?.text,
            design: item.values?.find(
              (v) => v.columnName === ColumnTitles.Design
            )?.text,
            size: item.values?.find((v) => v.columnName === ColumnTitles.Size)
              ?.text,
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
            customerName: itemToDelete.values?.find(
              (v) => v.columnName === ColumnTitles.Customer_Name
            )?.text,
            design: itemToDelete.values?.find(
              (v) => v.columnName === ColumnTitles.Design
            )?.text,
            size: itemToDelete.values?.find(
              (v) => v.columnName === ColumnTitles.Size
            )?.text,
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
            customerName: createdItem.values?.find(
              (v) => v.columnName === ColumnTitles.Customer_Name
            )?.text,
            design: createdItem.values?.find(
              (v) => v.columnName === ColumnTitles.Design
            )?.text,
            size: createdItem.values?.find(
              (v) => v.columnName === ColumnTitles.Size
            )?.text,
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
          onSearchChange={setSearchTerm}
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
                onDragEnd={onDragEnd}
                onGetLabel={onGetLabel}
                onMarkCompleted={markItemCompleted}
                onShip={shipItem}
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
                  <WeeklySchedule />
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
