import React, { useState, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Search, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useOrderStore } from "@/stores/useOrderStore";
import { Item, ItemStatus, ColumnTitles } from "@/typings/types";
import { DeleteConfirmationDialog } from "@/components/ui/DeleteConfirmationDialog";
import { EditItemDialog } from "../EditItemDialog";
import { toast } from "sonner";
import { cn } from "@/utils/functions";
import { STATUS_COLORS } from "@/typings/constants";

// Import extracted components
import { OrderItem, processItem, STATUS_ORDER } from "../utils/orderUtils";
import { OrderCard } from "./OrderCard";
import { OrderDetailView } from "./OrderDetailView";
import { OrderFilterSheet } from "./OrderFilterSheet";

export const MobileOrderView = ({
  items: externalItems,
  onDelete: externalHandleDelete,
  onGetLabel: externalHandleGetLabel,
  onMarkCompleted: externalHandleMarkCompleted,
  onShip: externalHandleShip,
}: {
  items?: Item[];
  onDelete?: (itemId: string) => Promise<void>;
  onGetLabel?: (item: Item) => void;
  onMarkCompleted?: (itemId: string) => Promise<void>;
  onShip?: (itemId: string) => Promise<void>;
}) => {
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deletingItem, setDeletingItem] = useState<Item | null>(null);
  const [filters, setFilters] = useState<any>({});

  // Get data from stores
  const storeData = useOrderStore();

  // Use either external items or fallback to store items
  const allItems = externalItems || storeData.items || [];

  const columnVisibility = {
    "Customer Name": true,
    Design: true,
    Size: true,
    "Due Date": true,
    Painted: true,
    Backboard: true,
    Glued: true,
    Packaging: true,
    Boxes: true,
    Notes: true,
  };

  // Process items to OrderItems
  const processedItems = useMemo(() => {
    return (allItems || []).map(processItem);
  }, [allItems]); // Dependency: allItems

  // Load done items when the "Done" tab is clicked or expanded
  // useEffect(() => {
  //   if (
  //     (activeTab === "all" || activeTab === ItemStatus.Done) &&
  //     !storeData.doneItemsLoaded
  //   ) {
  //     storeData.loadDoneItems();
  //   }
  // }, [activeTab, storeData.doneItemsLoaded, storeData.loadDoneItems]);

  // Filter items based on active tab and search query
  const filteredItems = useMemo(() => {
    return processedItems.filter((item) => {
      // 0. Skip deleted items
      if (item.deleted) return false;

      // 1. Filter by activeTab status
      if (activeTab !== "all") {
        // Check if activeTab corresponds to a valid ItemStatus enum value
        const isValidStatusTab = Object.values(ItemStatus).includes(
          activeTab as ItemStatus
        );

        if (isValidStatusTab) {
          // If the active tab is a valid status, filter by it
          if (item.status !== (activeTab as ItemStatus)) {
            return false; // Item doesn't match the selected status tab
          }
        } else {
          // If activeTab is not 'all' and not a valid status enum member,
          // it might be an unexpected value. Log a warning.
          console.warn(`Filtering by potentially invalid tab: ${activeTab}`);
        }
      }

      // 2. Filter by status array from the filter sheet
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(item.status)) {
          return false;
        }
      }

      // 3. Filter by due date range
      if (filters.dueDateFrom && item.dueDate) {
        try {
          const fromDate = new Date(filters.dueDateFrom);
          const itemDate = new Date(item.dueDate);
          // Normalize dates to compare day only
          fromDate.setHours(0, 0, 0, 0);
          itemDate.setHours(0, 0, 0, 0);
          if (itemDate < fromDate) {
            return false;
          }
        } catch (e) {
          console.error("Error parsing dueDateFrom:", e);
          // Ignore filter if date is invalid
        }
      }

      if (filters.dueDateTo && item.dueDate) {
        try {
          const toDate = new Date(filters.dueDateTo);
          const itemDate = new Date(item.dueDate);
          // Normalize dates
          toDate.setHours(0, 0, 0, 0);
          itemDate.setHours(0, 0, 0, 0);
          // Make the 'to' date inclusive: check if itemDate is on or before toDate
          if (itemDate > toDate) {
            return false;
          }
        } catch (e) {
          console.error("Error parsing dueDateTo:", e);
          // Ignore filter if date is invalid
        }
      }

      // 4. Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = item.customerName?.toLowerCase().includes(query);
        const designMatch = item.design?.toLowerCase().includes(query);
        const sizeMatch = item.size?.toLowerCase().includes(query);
        const idMatch = item.id.toLowerCase().includes(query);

        if (!(nameMatch || designMatch || sizeMatch || idMatch)) {
          return false;
        }
      }

      // If all checks passed, include the item
      return true;
    });
  }, [processedItems, activeTab, filters, searchQuery]); // Dependencies

  // Group and sort filtered items by status
  const sortedGroupedItems = useMemo(() => {
    const grouped = filteredItems.reduce((acc, item) => {
      const status = item.status || "Unknown"; // Handle potential undefined status
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(item);
      return acc;
    }, {} as Record<string, OrderItem[]>);

    // Sort the groups according to STATUS_ORDER
    return STATUS_ORDER.reduce(
      (acc: Record<ItemStatus, OrderItem[]>, status: ItemStatus) => {
        if (grouped[status]) {
          acc[status] = grouped[status];
        }
        return acc;
      },
      {} as Record<ItemStatus, OrderItem[]>
    );
  }, [filteredItems]); // Dependency: filteredItems

  // Handle editing item
  const handleEdit = useCallback((item: Item) => {
    setEditingItem(item);
    setSelectedOrder(null);
  }, []);

  // Handle saving edits
  const handleSaveEdit = useCallback(
    async (updatedItem: Item) => {
      if (updatedItem) {
        try {
          await storeData.updateItem(updatedItem);
          setEditingItem(null);
          toast.success("Item updated successfully");
        } catch (error) {
          console.error("Failed to update item:", error);
          toast.error("Failed to update item. Please try again.");
        }
      }
    },
    [storeData.updateItem]
  );

  // Handle deleting item
  const handleDelete = useCallback(async (item: Item) => {
    setDeletingItem(item);
    setSelectedOrder(null);
  }, []);

  // Handle confirming delete
  const handleConfirmDelete = useCallback(async () => {
    if (deletingItem) {
      try {
        if (externalHandleDelete) {
          await externalHandleDelete(deletingItem.id);
        } else {
          await storeData.deleteItem(deletingItem.id);
        }
        setDeletingItem(null);
        toast.success("Item deleted successfully");
      } catch (error) {
        console.error("Failed to delete item:", error);
        toast.error("Failed to delete item. Please try again.");
      }
    }
  }, [deletingItem, externalHandleDelete, storeData]);

  // Handle shipping item
  const handleShip = useCallback(
    async (itemId: string) => {
      if (externalHandleShip) {
        await externalHandleShip(itemId);
      } else {
        // Fallback to local implementation
        toast.success("Item marked as shipped");
      }
    },
    [externalHandleShip]
  );

  // Handle marking item as completed
  const handleMarkCompleted = useCallback(
    async (itemId: string) => {
      if (externalHandleMarkCompleted) {
        await externalHandleMarkCompleted(itemId);
      } else {
        // Fallback to local implementation
        toast.success("Item marked as completed");
      }
    },
    [externalHandleMarkCompleted]
  );

  // Handle getting shipping label
  const handleGetLabel = useCallback(
    (item: Item) => {
      if (externalHandleGetLabel) {
        externalHandleGetLabel(item);
      } else {
        // Fallback to local implementation
        toast.success("Navigating to shipping dashboard");
      }
    },
    [externalHandleGetLabel]
  );

  // Handle applying filters
  const handleFilterApply = useCallback((newFilters: any) => {
    setFilters(newFilters);
  }, []);

  // Create a stable function for selecting an order
  const handleSelectOrder = useCallback((item: OrderItem) => {
    setSelectedOrder(item);
  }, []); // No dependencies needed as setSelectedOrder is stable

  // Memoize the selectedOrder component to prevent unnecessary rerenders when opening/closing the detail view
  const memoizedSelectedOrder = useMemo(() => {
    return (
      selectedOrder && (
        <OrderDetailView
          orderId={selectedOrder.id}
          onClose={() => setSelectedOrder(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onShip={handleShip}
          onMarkCompleted={handleMarkCompleted}
          onGetLabel={handleGetLabel}
        />
      )
    );
  }, [
    selectedOrder,
    handleEdit,
    handleDelete,
    handleShip,
    handleMarkCompleted,
    handleGetLabel,
  ]);

  return (
    <div className="relative h-full flex flex-col">
      {/* Header with actions */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">Orders</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSearchVisible(!isSearchVisible)}
            >
              <Search className="h-5 w-5" />
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Filter className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 w-[320px] sm:w-[400px]">
                <OrderFilterSheet
                  onApply={handleFilterApply}
                  columnVisibility={columnVisibility}
                />
              </SheetContent>
            </Sheet>

            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" variant="default">
                  <Plus className="h-5 w-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <div className="p-2">
                  <h2 className="text-xl font-semibold mb-4">
                    Create New Order
                  </h2>
                  <p className="text-sm text-gray-500">
                    New order form would go here
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {isSearchVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-4 overflow-hidden"
            >
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs for status filter */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <ScrollArea className="w-full whitespace-nowrap border-b border-gray-200 dark:border-gray-800">
            <TabsList className="px-4 bg-transparent flex w-max space-x-1">
              <TabsTrigger
                value="all"
                className="rounded-md px-3 py-1.5 h-auto text-sm"
              >
                All
              </TabsTrigger>
              {/* Map directly over ItemStatus values */}
              {Object.values(ItemStatus)
                .filter((status) => status !== ItemStatus.Hidden)
                .map((status) => (
                  <TabsTrigger
                    key={status}
                    value={status}
                    className="rounded-md px-3 py-1.5 h-auto text-sm"
                  >
                    {status}
                  </TabsTrigger>
                ))}
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </Tabs>
      </div>

      {/* Order list - Updated to show sections */}
      <div className="flex-1 overflow-auto p-4 pb-16">
        {Object.keys(sortedGroupedItems).length > 0 ? (
          Object.entries(sortedGroupedItems).map(
            ([statusString, items]: [string, OrderItem[]]) => {
              const status = statusString as ItemStatus; // Cast status string to ItemStatus
              // Only render the section if the active tab is 'all' or matches the status
              if (activeTab !== "all" && activeTab !== status) {
                return null;
              }

              return (
                <div key={status} className="mb-4">
                  <div
                    className={cn(
                      "w-full p-4 font-semibold text-lg sticky top-0 z-5 bg-white dark:bg-gray-900",
                      `text-${STATUS_COLORS[status]}`,
                      `dark:text-${STATUS_COLORS[status]}`
                    )}
                  >
                    {status}
                  </div>

                  {/* Items within the section */}
                  {status === ItemStatus.Done && !storeData.doneItemsLoaded ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                      Loading done items...
                    </p>
                  ) : items.length > 0 ? (
                    items.map((item) => (
                      <OrderCard
                        key={item.id}
                        item={item}
                        onSelect={handleSelectOrder}
                      />
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400 p-2">
                      No items in this section.
                    </p>
                  )}
                </div>
              );
            }
          )
        ) : (
          <div className="flex flex-col items-center justify-center text-center h-full">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-full p-4 mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium">No orders found</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : "Try adjusting your filters"}
            </p>
          </div>
        )}
      </div>

      {/* Order detail sheet */}
      <Sheet
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      >
        <SheetContent side="bottom" className="p-0 h-[90vh]">
          {memoizedSelectedOrder}
        </SheetContent>
      </Sheet>

      {/* Edit item dialog */}
      <EditItemDialog
        editingItem={editingItem}
        handleSaveEdit={handleSaveEdit}
        setEditingItem={setEditingItem}
      />

      {/* Delete confirmation dialog */}
      <DeleteConfirmationDialog
        isOpen={Boolean(deletingItem)}
        itemName={
          deletingItem?.values.find(
            (v) => v.columnName === ColumnTitles.Customer_Name
          )?.text || "Unknown"
        }
        onClose={() => setDeletingItem(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default MobileOrderView;
