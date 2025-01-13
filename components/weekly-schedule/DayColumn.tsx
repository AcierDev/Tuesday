import { ColumnTitles, DayName, Item, ItemStatus } from "@/typings/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Check, GripVertical, Info, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { PaintRequirementsDialog } from "./PaintRequirementsDialog";
import { cn } from "@/utils/functions";

type NewType = Item;

interface DayColumnProps {
  day: DayName;
  dayItemIds: { id: string; done: boolean }[];
  items: Item[];
  calculateTotalSquares: (
    dayItemIds: { id: string; done: boolean }[]
  ) => number;
  handleAddItem: (day: string) => void;
  handleRemoveItem: (day: string, itemId: string) => void;
  setConfirmCompleteItem: (item: Item | null) => void;
  getItemValue: (item: NewType, columnName: ColumnTitles) => string;
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
}: DayColumnProps) {
  const [showPaintRequirements, setShowPaintRequirements] = useState(false);

  const dayItems = items.filter((item) =>
    dayItemIds.some((scheduleItem) => scheduleItem.id === item.id)
  );

  return (
    <>
      <Card className="flex-1 flex flex-col m-1 bg-background shadow-sm overflow-hidden dark:bg-gray-700">
        <CardHeader className="py-2 px-3 bg-muted dark:bg-gray-600">
          <CardTitle className="text-sm flex justify-between items-center">
            <span>{day}</span>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-normal">
                Squares: {calculateTotalSquares(dayItemIds)}
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
                                <p className="font-semibold truncate">
                                  {getItemValue(
                                    item,
                                    ColumnTitles.Customer_Name
                                  )}
                                </p>
                                <p className="text-muted-foreground truncate">
                                  {getItemValue(item, ColumnTitles.Design)} -{" "}
                                  {getItemValue(item, ColumnTitles.Size)}
                                </p>
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
        <Button
          className="m-2 dark:bg-gray-600"
          size="sm"
          variant="outline"
          onClick={() => handleAddItem(day)}
        >
          <Plus className="mr-1 h-3 w-3" /> Add
        </Button>
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
