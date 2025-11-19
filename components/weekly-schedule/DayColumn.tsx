import { ColumnTitles, DayName, Item, ItemStatus } from "@/typings/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  GripVertical,
  Info,
  Minus,
  Plus,
  MousePointerClick,
} from "lucide-react";
import { useState } from "react";
import { useTheme } from "next-themes";
import { parseMinecraftColors } from "@/parseMinecraftColors";
import { PaintRequirementsDialog } from "./PaintRequirementsDialog";
import { cn } from "@/utils/functions";
import { format, startOfWeek, addDays } from "date-fns";
import { SplitButton } from "@/components/ui/split-button";

type BadgeStatus = {
  text: string;
  classes: string;
};

const getDueDateStatus = (
  dueDate: Date | null,
  useNumber: boolean,
  scheduledDate?: Date
): BadgeStatus => {
  if (!dueDate) {
    return {
      text: "?",
      classes: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    };
  }

  const referenceDate = scheduledDate || new Date();
  referenceDate.setHours(0, 0, 0, 0);
  const dueDateStart = new Date(dueDate);
  dueDateStart.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (dueDateStart.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    return {
      text: useNumber
        ? diffDays.toString()
        : diffDays === -1
        ? "Yesterday"
        : diffDays === -2
        ? "2 days ago"
        : diffDays > -7 // Less than a week ago
        ? "3+ days ago"
        : diffDays > -30 // Less than a month ago
        ? "Week+ ago"
        : "Month+ ago",
      classes: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
  } else if (diffDays === 0) {
    return {
      text: useNumber ? "0" : "Today",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays === 1) {
    return {
      text: useNumber ? "+1" : "Tomorrow",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays === 2) {
    return {
      text: useNumber ? "+2" : "2 days",
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    };
  } else if (diffDays < 7) {
    return {
      text: useNumber ? `+${diffDays}` : "3+ days",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  } else if (diffDays < 30) {
    return {
      text: useNumber ? `+${diffDays}` : "Week+",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  } else {
    return {
      text: useNumber ? `+${diffDays}` : "Month+",
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };
  }
};

interface DayColumnProps {
  day: DayName;
  dayItemIds: { id: string; done: boolean }[];
  items: Item[];
  calculateTotalSquares: (dayItems: { id: string; done: boolean }[]) => {
    count: number;
    hasIndeterminate: boolean;
  };
  handleAddItem: (day: DayName) => void;
  handleRemoveItem: (day: DayName, itemId: string) => void;
  setConfirmCompleteItem: (item: Item | null) => void;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
  currentWeekStart?: Date;
  useNumber?: boolean;
  onBadgeClick?: () => void;
  onStartClickToAdd?: (day: DayName, weekKey: string) => void;
  clickToAddTarget?: { day: DayName; weekKey: string } | null;
}

export function DayColumn({
  day,
  dayItemIds,
  items,
  calculateTotalSquares,
  handleAddItem,
  handleRemoveItem,
  setConfirmCompleteItem,
  getItemValue,
  currentWeekStart,
  useNumber = true,
  onBadgeClick,
  onStartClickToAdd,
  clickToAddTarget,
}: DayColumnProps) {
  const [showPaintRequirements, setShowPaintRequirements] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  // Calculate the date for this specific day
  const getScheduledDate = () => {
    if (!currentWeekStart) return new Date();
    const dayIndex = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ].indexOf(day);
    return addDays(currentWeekStart, dayIndex);
  };

  const dayItems = items.filter((item) =>
    dayItemIds.some((scheduleItem) => scheduleItem.id === item.id)
  );

  const isTarget =
    clickToAddTarget?.day === day &&
    clickToAddTarget?.weekKey ===
      format(currentWeekStart || new Date(), "yyyy-MM-dd");

  return (
    <>
      <Card
        className={cn(
          "flex-1 flex flex-col m-1 bg-background shadow-sm overflow-hidden dark:bg-gray-700",
          isTarget &&
            "ring-2 ring-primary ring-offset-2 transition-all duration-300"
        )}
      >
        <CardHeader className="py-2 px-3 bg-muted dark:bg-gray-600">
          <CardTitle className="text-sm flex justify-between items-center">
            <span>{day}</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-normal">
                Squares:{" "}
                {(() => {
                  const result = calculateTotalSquares(dayItemIds);
                  return `${result.count}${result.hasIndeterminate ? "+" : ""}`;
                })()}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setShowPaintRequirements(true)}
              >
                <Info className="h-4 w-4" />
                <span className="sr-only">Paint requirements</span>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-grow p-2 overflow-y-auto">
          <Droppable droppableId={day}>
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2 min-h-full"
              >
                {dayItemIds.map((scheduleItem, index) => {
                  const item = items.find((i) => i.id === scheduleItem.id);
                  if (!item) return null;
                  return (
                    <Draggable
                      key={scheduleItem.id}
                      draggableId={scheduleItem.id}
                      index={index}
                    >
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "p-2 rounded-md shadow-sm hover:shadow-md transition-shadow duration-200 text-xs",
                            scheduleItem.done || item.status === ItemStatus.Done
                              ? "bg-green-100 dark:bg-green-500/30"
                              : "bg-muted dark:bg-gray-600"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-grow">
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="flex-grow">
                                <div className="font-semibold truncate">
                                  {parseMinecraftColors(
                                    getItemValue(
                                      item,
                                      ColumnTitles.Customer_Name
                                    ),
                                    isDarkMode
                                  )}
                                </div>
                                <div className="text-muted-foreground truncate text-xs flex items-center gap-2">
                                  <span>
                                    {getItemValue(item, ColumnTitles.Design)} -{" "}
                                    {getItemValue(item, ColumnTitles.Size)}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] px-1 py-0 h-4",
                                      (() => {
                                        const dueDate = new Date(
                                          getItemValue(item, ColumnTitles.Due)
                                        );
                                        const badgeStatus = getDueDateStatus(
                                          isNaN(dueDate.getTime())
                                            ? null
                                            : dueDate,
                                          useNumber,
                                          getScheduledDate()
                                        );
                                        return badgeStatus.classes;
                                      })(),
                                      "cursor-pointer hover:opacity-80"
                                    )}
                                    onClick={onBadgeClick}
                                  >
                                    {(() => {
                                      const dueDate = new Date(
                                        getItemValue(item, ColumnTitles.Due)
                                      );
                                      const badgeStatus = getDueDateStatus(
                                        isNaN(dueDate.getTime())
                                          ? null
                                          : dueDate,
                                        useNumber,
                                        getScheduledDate()
                                      );
                                      return badgeStatus.text;
                                    })()}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-1">
                              {item.status !== ItemStatus.Done &&
                                !scheduleItem.done && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      console.log("complete item", item);
                                      setConfirmCompleteItem(item);
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    <Check className="h-3 w-3" />
                                    <span className="sr-only">
                                      Complete item
                                    </span>
                                  </Button>
                                )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveItem(day, item.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Minus className="h-3 w-3" />
                                <span className="sr-only">Remove item</span>
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </CardContent>
        {isTarget ? (
        <Button
            className="m-2 bg-red-500 hover:bg-red-600 text-white"
            size="sm"
            onClick={() => onStartClickToAdd?.(day, "")} // Passing empty string to signal cancel
          >
            Cancel Selection
          </Button>
        ) : (
          <SplitButton
            className="m-2 flex dark:bg-gray-600"
          size="sm"
          variant="outline"
            onMainClick={() =>
              onStartClickToAdd?.(
                day,
                format(currentWeekStart || new Date(), "yyyy-MM-dd")
              )
            }
            onSplitClick={() => handleAddItem(day)}
            mainContent={<MousePointerClick className="h-3 w-3" />}
            splitContent={
              <>
          <Plus className="mr-1 h-3 w-3" /> Add
              </>
            }
            splitButtonClassName="dark:bg-gray-600 w-1/2"
          />
        )}
      </Card>

      <PaintRequirementsDialog
        isOpen={showPaintRequirements}
        onClose={() => setShowPaintRequirements(false)}
        items={dayItems}
        dayTitle={day}
        getItemValue={getItemValue}
      />
    </>
  );
}
