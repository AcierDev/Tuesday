import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DayName } from "@/typings/types";

interface RescheduleConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  day?: DayName;
  mode: "day" | "week" | "reinclude" | "restoreWeek";
  weekStartDate?: Date;
}

export function RescheduleConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  day,
  mode,
  weekStartDate,
}: RescheduleConfirmDialogProps) {
  const handleConfirm = () => {
    if (mode === "day" && day) {
      console.log(`Rescheduling items from day ${day}...`);
    } else if (mode === "week" && weekStartDate) {
      console.log(
        `Rescheduling items from week of ${weekStartDate.toLocaleDateString()}...`
      );
    }
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reschedule Items</DialogTitle>
          <DialogDescription>
            {mode === "day"
              ? `Would you like to reschedule the items from ${day} to other available days?`
              : mode === "week"
              ? `Would you like to reschedule the items from this week to other available weeks?`
              : mode === "reinclude"
              ? `Would you like to include ${day} in the scheduling again?`
              : `Would you like to reschedule with all days in this week included?`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep Schedule
          </Button>
          <Button onClick={handleConfirm}>Reschedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
