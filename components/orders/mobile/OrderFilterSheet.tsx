import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";

interface OrderFilterSheetProps {
  onApply: (filters: any) => void;
  columnVisibility: Record<string, boolean>;
}

export const OrderFilterSheet: React.FC<OrderFilterSheetProps> = ({
  onApply,
  columnVisibility,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string[]>([]);
  const [dueDateFrom, setDueDateFrom] = useState<string>("");
  const [dueDateTo, setDueDateTo] = useState<string>("");

  const toggleStatus = (status: string) => {
    if (selectedStatus.includes(status)) {
      setSelectedStatus(selectedStatus.filter((s) => s !== status));
    } else {
      setSelectedStatus([...selectedStatus, status]);
    }
  };

  const handleApply = () => {
    onApply({
      status: selectedStatus,
      priority: selectedPriority,
      dueDateFrom,
      dueDateTo,
    });
  };

  const clearAll = () => {
    setSelectedStatus([]);
    setSelectedPriority([]);
    setDueDateFrom("");
    setDueDateTo("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-bold">Filter Orders</h2>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-6">
          {/* Status filter */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Status</h3>
            <div className="flex flex-wrap gap-2">
              {Object.values(ItemStatus).map((status) => (
                <Badge
                  key={status}
                  variant={
                    selectedStatus.includes(status) ? "default" : "outline"
                  }
                  className={`cursor-pointer ${
                    !selectedStatus.includes(status)
                      ? STATUS_COLORS[status]
                      : ""
                  }`}
                  onClick={() => toggleStatus(status)}
                >
                  {status}
                </Badge>
              ))}
            </div>
          </div>

          {/* Date range filter */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Due Date Range</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  From
                </p>
                <Input
                  type="date"
                  value={dueDateFrom}
                  onChange={(e) => setDueDateFrom(e.target.value)}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  To
                </p>
                <Input
                  type="date"
                  value={dueDateTo}
                  onChange={(e) => setDueDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Column visibility toggles */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Show/Hide Fields</h3>
            <div className="space-y-2">
              {Object.entries(columnVisibility).map(([column, isVisible]) => (
                <div key={column} className="flex items-center">
                  <input
                    type="checkbox"
                    id={`column-${column}`}
                    checked={isVisible}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onChange={() => {}} // This would be handled by the settings context
                  />
                  <label htmlFor={`column-${column}`} className="ml-2 text-sm">
                    {column}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={clearAll}>
            Clear All
          </Button>
          <Button className="flex-1" onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
};
