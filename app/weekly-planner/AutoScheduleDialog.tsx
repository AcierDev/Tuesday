import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Item, DayName, ColumnTitles } from "@/typings/types";
import { useAutoScheduleStore } from "./stores/useAutoScheduleStore";
import { DialogWeekSelector } from "./DialogWeekSelector";
import { useState, useEffect } from "react";
import { startOfWeek, format } from "date-fns";

interface AutoSchedulePreview {
  [key: string]: {
    day: DayName;
    item: Item;
  }[];
}

interface AutoScheduleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
  plannerCurrentWeek: Date;
}

export function AutoScheduleDialog({
  isOpen,
  onClose,
  onConfirm,
  getItemValue,
  plannerCurrentWeek,
}: AutoScheduleDialogProps) {
  const { proposedSchedule, setProposedSchedule } = useAutoScheduleStore();
  const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
    startOfWeek(plannerCurrentWeek, { weekStartsOn: 0 })
  );

  useEffect(() => {
    setSelectedWeekStart(startOfWeek(plannerCurrentWeek, { weekStartsOn: 0 }));
  }, [plannerCurrentWeek]);

  // Get items for the selected week
  const selectedWeekKey = format(selectedWeekStart, "yyyy-MM-dd");
  const currentWeekItems = proposedSchedule[selectedWeekKey] || [];

  const daysOfWeek: DayName[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
  ];

  const handleWeekChange = (direction: "prev" | "next") => {
    setSelectedWeekStart((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
      return startOfWeek(newDate, { weekStartsOn: 0 });
    });
  };

  const calculateBlocks = (item: Item): number => {
    const sizeStr =
      item.values.find((v) => v.columnName === "Size")?.text || "";
    const dimensions = sizeStr.split("x").map((dim) => parseFloat(dim.trim()));
    const width = dimensions[0] || 0;
    const height = dimensions[1] || 0;
    return width * height;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader className="space-y-4">
          <div>
            <DialogTitle>Auto Schedule Preview</DialogTitle>
            <div className="text-center">
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                Items will be scheduled starting from your selected week in the
                planner
              </DialogDescription>
            </div>
          </div>
          <div className="flex justify-center">
            <DialogWeekSelector
              currentWeekStart={selectedWeekStart}
              onChangeWeek={handleWeekChange}
              referenceWeek={plannerCurrentWeek}
              weekStartsOn={0}
            />
          </div>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-4 py-4">
          {daysOfWeek.map((day) => {
            const dayItems = currentWeekItems.filter(
              (item) => item.day === day
            );

            const totalBlocks = dayItems.reduce((total, { item }) => {
              return total + calculateBlocks(item);
            }, 0);

            return (
              <div key={day} className="flex flex-col">
                <div className="text-center border-b pb-2 mb-3">
                  <h3 className="font-semibold text-lg">{day}</h3>
                  <p className="text-sm text-muted-foreground">
                    Blocks: {totalBlocks}
                  </p>
                </div>
                <div className="space-y-2 flex-1">
                  {dayItems.length > 0 ? (
                    dayItems.map(({ item }) => (
                      <div
                        key={item.id}
                        className="text-sm bg-muted/30 rounded p-2 border"
                      >
                        <div className="font-medium">
                          {getItemValue(item, ColumnTitles.Customer_Name)}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {getItemValue(item, ColumnTitles.Design)}
                          {" ("}
                          {getItemValue(item, ColumnTitles.Size)}
                          {")"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic text-center">
                      No items
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
