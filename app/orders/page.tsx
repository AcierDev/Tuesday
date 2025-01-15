"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Toaster, toast } from "sonner";
import { DropResult, ResponderProvided } from "@hello-pangea/dnd";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Header } from "@/components/orders/Header";
import { ItemList } from "@/components/orders/ItemList";
import { NewItemModal } from "@/components/orders/NewItemModal";
import { WeeklySchedule } from "@/components/weekly-schedule/WeeklySchedule";
import { SettingsPanel } from "@/components/setttings/SettingsPanel";
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

  const { board, updateItem, addNewItem, deleteItem, reorderItems } =
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
    if (!board) return {};

    const counts: Record<string, number> = {
      all: 0,
      geometric: 0,
      striped: 0,
      tiled: 0,
      mini: 0,
      custom: 0,
    };

    board.items_page.items.forEach((item) => {
      if (isItemDue(item)) {
        counts.all++;

        const design =
          item.values.find((v) => v.columnName === "Design")?.text || "";
        const size =
          item.values.find((v) => v.columnName === "Size")?.text || "";

        const isMini = size === ItemSizes.Fourteen_By_Seven;

        if (design.startsWith("Striped") && !isMini) counts.striped++;
        else if (design.startsWith("Tiled") && !isMini) counts.tiled++;
        else if (
          !design.startsWith("Striped") &&
          !isMini &&
          !design.startsWith("Tiled")
        )
          counts.geometric++;

        if (isMini) counts.mini++;
        if (!Object.values(ItemDesigns).includes(design as ItemDesigns))
          counts.custom++;
      }
    });

    return counts;
  }, [board, isItemDue]);

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
      const itemToUpdate = board?.items_page.items.find(
        (item) => item.id === itemToComplete
      );
      if (!itemToUpdate) {
        throw new Error("Item not found");
      }

      const updatedItem = {
        ...itemToUpdate,
        previousStatus: itemToUpdate.status,
        status: ItemStatus.Done,
        completedAt: Date.now(),
      };

      await updateItem(updatedItem, "status", true);

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
  }, [board, updateItem, itemToComplete]);

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

      if (!destination || !board || !draggableId) return;

      const movedItem = board.items_page.items.find(
        (item) => item.id && item.id.toString() === draggableId
      );

      if (!movedItem) {
        console.error("Could not find item with id:", draggableId);
        return;
      }

      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const newStatus = Object.values(ItemStatus).find(
        (status) => status === destination.droppableId
      );

      if (!newStatus) return;

      const sourceStatus = source.droppableId as ItemStatus;
      const statusChanged = sourceStatus !== newStatus;

      try {
        const originalStatus = movedItem.status;

        await reorderItems(
          movedItem.id,
          sourceStatus,
          newStatus,
          destination.index
        );

        if (statusChanged) {
          const updatedItem = {
            ...movedItem,
            previousStatus: originalStatus,
            status: newStatus,
          };

          await logActivity(
            updatedItem.id!,
            "status_change",
            [
              {
                field: "status",
                oldValue: originalStatus,
                newValue: newStatus,
              },
            ],
            {
              customerName: updatedItem.values?.find(
                (v) => v.columnName === ColumnTitles.Customer_Name
              )?.text,
              design: updatedItem.values?.find(
                (v) => v.columnName === ColumnTitles.Design
              )?.text,
              size: updatedItem.values?.find(
                (v) => v.columnName === ColumnTitles.Size
              )?.text,
            }
          );

          toast.success(getStatusChangeMessage(newStatus), {
            style: { background: "#10B981", color: "white" },
            action: {
              label: "Undo",
              onClick: () => undoStatusChange(updatedItem, originalStatus),
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
    [board, reorderItems, undoStatusChange, logActivity]
  );

  const getUniqueGroupValues = useCallback((items: Item[], field: string) => {
    const uniqueValues = new Set<string>();
    items.forEach((item) => {
      const value =
        item.values.find((v) => v.columnName === field)?.text || "Other";
      uniqueValues.add(value);
    });
    return Array.from(uniqueValues);
  }, []);

  const filteredGroups = useMemo(() => {
    if (!board) return [];

    let groupValues: string[];
    if (settings.groupingField === "Status") {
      groupValues = Object.values(ItemStatus);
    } else {
      groupValues = getUniqueGroupValues(
        board.items_page.items,
        settings.groupingField
      );
    }

    const groups = groupValues.map((value) => ({
      id: value,
      title: value,
      items: [] as Item[],
    }));

    board.items_page.items
      .filter((item) => !item.deleted && item.visible)
      .forEach((item) => {
        if (
          item.values.some((value) =>
            String(value.text || "")
              .toLowerCase()
              .includes(searchTerm.toLowerCase())
          )
        ) {
          const groupField =
            settings.groupingField === "Status"
              ? item.status
              : item.values.find((v) => v.columnName === settings.groupingField)
                  ?.text || "Other";

          const group = groups.find((g) => g.title === groupField);
          if (
            group &&
            (settings.groupingField !== "Status" ||
              settings.showCompletedOrders ||
              item.status !== ItemStatus.Done)
          ) {
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
                    !Object.values(ItemDesigns).includes(
                      design as ItemDesigns
                    ) && !isMini
                  );
                default:
                  return false;
              }
            })();

            if (shouldInclude) {
              group.items.push(item);
            }
          }
        }
      });

    return groups;
  }, [
    board,
    settings.groupingField,
    settings.showCompletedOrders,
    searchTerm,
    getUniqueGroupValues,
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
        const itemToDelete = board?.items_page.items.find(
          (item) => item.id === itemId
        );
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
    [board, deleteItem, undoItemDeletion]
  );

  useEffect(() => {
    if (isWeeklyPlannerOpen) {
      const event = new CustomEvent("weeklyScheduleUpdate");
      window.dispatchEvent(event);
    }
  }, [isWeeklyPlannerOpen]);

  const handleUpdateItem = async (item: Item, changedField?: ColumnTitles) => {
    try {
      // Find the old item to compare values
      const oldItem = board?.items_page.items.find((i) => i.id === item.id);

      await updateItem(item, changedField);

      // Only log if we have a changed field and can find the old value
      if (changedField && oldItem) {
        const oldValue =
          oldItem.values.find((v) => v.columnName === changedField)?.text || "";
        const newValue =
          item.values.find((v) => v.columnName === changedField)?.text || "";

        // Only log if the value actually changed
        if (oldValue !== newValue) {
          await logActivity(
            item.id!,
            "update",
            [
              {
                field: changedField,
                oldValue,
                newValue,
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
        }
      }
    } catch (error) {
      console.error("Failed to update item:", error);
      toast.error("Failed to update item", {
        style: { background: "#EF4444", color: "white" },
      });
    }
  };

  const handleAddNewItem = async (newItem: Partial<Item>) => {
    try {
      await addNewItem(newItem);

      // Log the creation of a new item
      if (newItem.id) {
        await logActivity(
          newItem.id,
          "create",
          [
            {
              field: "status",
              oldValue: "",
              newValue: ItemStatus.New,
            },
          ],
          {
            customerName: newItem.values?.find(
              (v) => v.columnName === ColumnTitles.Customer_Name
            )?.text,
            design: newItem.values?.find(
              (v) => v.columnName === ColumnTitles.Design
            )?.text,
            size: newItem.values?.find(
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
      <Header
        isMobile={isMobile}
        searchTerm={searchTerm}
        onNewOrder={() => setIsNewItemModalOpen(true)}
        onSearchChange={setSearchTerm}
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        dueCounts={dueCounts}
      />
      <div className="flex-grow">
        <div className="h-full max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex h-full relative">
            <div
              className={cn(
                "flex-grow transition-all duration-300 ease-in-out min-w-0",
                isWeeklyPlannerOpen ? "pr-80" : ""
              )}
              style={{ contain: "paint" }}
            >
              <ItemList
                board={board!}
                groups={sortedGroups}
                onDelete={handleDeleteItem}
                onDragEnd={onDragEnd}
                onGetLabel={onGetLabel}
                onMarkCompleted={markItemCompleted}
                onShip={shipItem}
                onUpdate={handleUpdateItem}
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
              {board && isWeeklyPlannerOpen && (
                <div className="h-full bg-white dark:bg-transparent shadow-lg rounded-l-lg">
                  <WeeklySchedule
                    key={isWeeklyPlannerOpen ? "open" : "closed"}
                    boardId={board.id}
                    items={board.items_page.items.filter(
                      (item) => !item.deleted && item.visible
                    )}
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
        board={board}
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
