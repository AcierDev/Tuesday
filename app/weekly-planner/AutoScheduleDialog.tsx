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
  preview: AutoSchedulePreview;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
}

export function AutoScheduleDialog({
  isOpen,
  onClose,
  onConfirm,
  getItemValue,
}: Omit<AutoScheduleDialogProps, "preview">) {
  const { proposedSchedule } = useAutoScheduleStore();
  const currentWeekItems = Object.values(proposedSchedule)[0] || [];
  const daysOfWeek: DayName[] = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Auto Schedule Items</DialogTitle>
          <DialogDescription>
            Review the proposed schedule before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-4 py-4">
          {daysOfWeek.map((day) => {
            const dayItems = currentWeekItems.filter(
              (item) => item.day === day
            );

            return (
              <div key={day} className="flex flex-col">
                <h3 className="font-semibold text-lg text-center border-b pb-2 mb-3">
                  {day}
                </h3>
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
