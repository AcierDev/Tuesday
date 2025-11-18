"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar, Package, User, Ruler, ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/functions";
import { ColumnTitles, DayName } from "@/typings/types";

import { OrderMeta, ScheduledPlacement } from "@/components/planning/types";

interface OrderListItemProps {
  meta: OrderMeta;
  onSchedule: (itemId: string, placement: ScheduledPlacement) => void;
}

const dayOptions: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const bucketStyles = {
  overdue: {
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    text: "Overdue",
  },
  thisWeek: {
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
    border: "border-yellow-200 dark:border-yellow-800",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    text: "This Week",
  },
  nextWeek: {
    bg: "bg-green-50 dark:bg-green-950/20",
    border: "border-green-200 dark:border-green-800",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    text: "Next Week",
  },
  future: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    text: "Future",
  },
  noDue: {
    bg: "bg-gray-50 dark:bg-gray-950/20",
    border: "border-gray-200 dark:border-gray-800",
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    text: "No Due Date",
  },
};

export function OrderListItem({ meta, onSchedule }: OrderListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<"current" | "next">("current");
  const [selectedDay, setSelectedDay] = useState<DayName>("Monday");

  const customerName = meta.item.customerName || "Unknown";
  const design = meta.item.design || "No Design";
  const size = meta.item.size || "No Size";

  const bucketStyle = bucketStyles[meta.bucket];

  const handleSchedule = () => {
    onSchedule(meta.id, {
      week: selectedWeek,
      day: selectedDay,
    });
  };

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all duration-200 hover:shadow-md",
        bucketStyle.bg,
        bucketStyle.border
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn("text-xs", bucketStyle.badge)}>
                {bucketStyle.text}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {meta.blocks} blocks
              </Badge>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {customerName}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Package className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{design}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Ruler className="h-4 w-4 flex-shrink-0" />
                <span>{size}</span>
              </div>
              {meta.dueDate && (
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>Due: {format(meta.dueDate, "MMM d, yyyy")}</span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>

        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Week
                </label>
                <Select
                  value={selectedWeek}
                  onValueChange={(value: "current" | "next") => setSelectedWeek(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">This Week</SelectItem>
                    <SelectItem value="next">Next Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                  Day
                </label>
                <Select
                  value={selectedDay}
                  onValueChange={(value: DayName) => setSelectedDay(value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleSchedule} className="w-full" size="sm">
              Schedule Order
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

