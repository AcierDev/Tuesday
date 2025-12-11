"use client";

import { useEffect, useState, useMemo } from "react";
import { useOrderStore } from "@/stores/useOrderStore";
import { useShippingStore } from "@/stores/useShippingStore";
import { Item, ItemStatus } from "@/typings/types";
import { ViewLabel } from "@/components/shipping/ViewLabel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, Barcode, Calendar, MapPin } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/utils/functions";
import { parseMinecraftColors } from "@/parseMinecraftColors";
import { useTheme } from "next-themes";
import { STATUS_COLORS, STATUS_BORDER_COLORS } from "@/typings/constants";

// Status priority for sorting (reverse workflow order)
const STATUS_PRIORITY = {
  [ItemStatus.At_The_Door]: 0,
  [ItemStatus.Packaging]: 1,
  [ItemStatus.Wip]: 2,
  [ItemStatus.OnDeck]: 3,
  [ItemStatus.New]: 4,
  // Other statuses pushed to the end
  [ItemStatus.Done]: 99,
  [ItemStatus.Hidden]: 99,
};

export default function LabelsPage() {
  const { items, loadItems, isLoading: isOrdersLoading } = useOrderStore();
  const {
    labels,
    fetchAllLabels,
    isLoading: isLabelsLoading,
  } = useShippingStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
    fetchAllLabels();
  }, []);

  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter(
      (item) =>
        item.status !== ItemStatus.Done && item.status !== ItemStatus.Hidden
    );

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.customerName?.toLowerCase().includes(query) ||
          item.id.includes(query) ||
          item.design?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      // 1. Status Priority
      const priorityA = STATUS_PRIORITY[a.status] ?? 99;
      const priorityB = STATUS_PRIORITY[b.status] ?? 99;

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // 2. Due Date (Earliest first / "Most due")
      // Assuming dueDate is a string YYYY-MM-DD or similar that sorts lexicographically,
      // or we parse it. The store says `dueDate?: string`.
      // Let's try string comparison first, assuming ISO format or standard date format.
      // If it's empty, push to end.
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return a.dueDate.localeCompare(b.dueDate);
    });

    return result;
  }, [items, searchQuery]);

  const handleCloseDialog = () => {
    setSelectedOrderId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b dark:border-gray-800 p-4 shadow-sm">
        <h1 className="text-xl font-bold mb-4">Picking & Labels</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            className="pl-9"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isOrdersLoading && items.length === 0 ? (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No active orders found.
          </div>
        ) : (
          filteredAndSortedItems.map((item) => (
            <OrderLabelCard
              key={item.id}
              item={item}
              hasLabel={!!labels[item.id]?.length}
              onViewLabel={() => setSelectedOrderId(item.id)}
            />
          ))
        )}
      </div>

      {/* Shared Dialog for ViewLabel */}
      <Dialog
        open={!!selectedOrderId}
        onOpenChange={(open) => !open && handleCloseDialog()}
      >
        <DialogContent className="max-w-4xl h-[90vh] p-0 gap-0 bg-gray-50 dark:bg-gray-900 overflow-hidden flex flex-col">
          <div className="p-4 border-b dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900">
            <DialogTitle>Label Management</DialogTitle>
            <Button variant="ghost" size="sm" onClick={handleCloseDialog}>
              Close
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {selectedOrderId && (
              <ViewLabel
                orderId={selectedOrderId}
                onClose={handleCloseDialog}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderLabelCard({
  item,
  hasLabel,
  onViewLabel,
}: {
  item: Item;
  hasLabel: boolean;
  onViewLabel: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Parse customer name with Minecraft colors
  const parsedCustomerName = parseMinecraftColors(
    item.customerName || "Unknown Customer",
    isDark
  );

  return (
    <Card
      onClick={onViewLabel}
      className={cn(
        "overflow-hidden border-l-4 shadow-sm dark:bg-gray-800 dark:border-gray-700 cursor-pointer transition-shadow hover:shadow-md",
        STATUS_BORDER_COLORS[item.status] || "border-l-transparent"
      )}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className={cn(
                  "text-white hover:opacity-90",
                  `bg-${STATUS_COLORS[item.status]}` || "bg-gray-500"
                )}
              >
                {item.status}
              </Badge>
            </div>
            <CardTitle className="text-lg leading-tight">
              {parsedCustomerName}
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onViewLabel();
            }}
            className="shrink-0 h-10 w-10"
          >
            <Barcode
              className={cn(
                "h-5 w-5",
                hasLabel
                  ? "text-yellow-500"
                  : "text-gray-500 dark:text-gray-400"
              )}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-2 space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="space-y-1">
            <span className="text-xs text-gray-500 block">Design</span>
            <span className="font-medium">{item.design || "N/A"}</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-gray-500 block">Size</span>
            <span className="font-medium">{item.size || "N/A"}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t dark:border-gray-800">
          <div className="flex items-center text-xs text-gray-500">
            <Calendar className="mr-1 h-3 w-3" />
            <span>
              Due:{" "}
              {item.dueDate
                ? format(new Date(item.dueDate), "MMM d, yyyy")
                : "No Date"}
            </span>
          </div>
          {item.shippingDetails && (
            <div className="flex items-center text-xs text-gray-500">
              <MapPin className="mr-1 h-3 w-3" />
              <span className="truncate max-w-[150px]">
                {item.shippingDetails.city}, {item.shippingDetails.state}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
