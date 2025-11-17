"use client";

import { format } from "date-fns";
import { Calendar, Package, User, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/utils/functions";
import { ColumnTitles } from "@/typings/types";

import { OrderMeta, ScheduledPlacement } from "@/components/planning/types";

interface ScheduledOrdersPreviewProps {
  scheduledThisWeek: { meta: OrderMeta; placement: ScheduledPlacement }[];
  scheduledNextWeek: { meta: OrderMeta; placement: ScheduledPlacement }[];
  onUnschedule: (itemId: string) => void;
}

export function ScheduledOrdersPreview({
  scheduledThisWeek,
  scheduledNextWeek,
  onUnschedule,
}: ScheduledOrdersPreviewProps) {
  const totalScheduled = scheduledThisWeek.length + scheduledNextWeek.length;

  const renderOrderItem = (
    meta: OrderMeta,
    placement: ScheduledPlacement,
    index: number
  ) => {
    const customerName =
      meta.item.values.find((v) => v.columnName === ColumnTitles.Customer_Name)?.text ||
      "Unknown";
    const design =
      meta.item.values.find((v) => v.columnName === ColumnTitles.Design)?.text ||
      "No Design";

    return (
      <div
        key={meta.id}
        className={cn(
          "group relative p-3 rounded-lg transition-colors duration-150",
          "bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800",
          index > 0 && "mt-2"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {placement.day || "Unassigned"}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {meta.blocks} blocks
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <User className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
              <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {customerName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <Package className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{design}</span>
            </div>
            {meta.dueDate && (
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Due: {format(meta.dueDate, "MMM d")}</span>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onUnschedule(meta.id)}
            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Scheduled Orders
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {totalScheduled === 0
            ? "No orders scheduled yet"
            : `${totalScheduled} order${totalScheduled === 1 ? "" : "s"} ready to apply`}
        </p>
      </div>

      {totalScheduled > 0 && (
        <ScrollArea className="h-[500px] pr-4">
          {scheduledThisWeek.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  This Week
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {scheduledThisWeek.length}
                </Badge>
              </div>
              <div>
                {scheduledThisWeek.map(({ meta, placement }, index) =>
                  renderOrderItem(meta, placement, index)
                )}
              </div>
            </div>
          )}

          {scheduledThisWeek.length > 0 && scheduledNextWeek.length > 0 && (
            <Separator className="my-4" />
          )}

          {scheduledNextWeek.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Next Week
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {scheduledNextWeek.length}
                </Badge>
              </div>
              <div>
                {scheduledNextWeek.map(({ meta, placement }, index) =>
                  renderOrderItem(meta, placement, index)
                )}
              </div>
            </div>
          )}
        </ScrollArea>
      )}

      {totalScheduled === 0 && (
        <div className="text-center py-12 text-sm text-gray-500 dark:text-gray-400 border border-dashed border-gray-200 dark:border-gray-700 rounded-lg">
          <Package className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p>Expand orders from the list to schedule them</p>
        </div>
      )}
    </div>
  );
}

