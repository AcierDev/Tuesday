import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

interface ConfirmClearWeekDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  weekStart: Date;
}

export const ConfirmClearWeekDialog = ({
  isOpen,
  onClose,
  onConfirm,
  weekStart,
}: ConfirmClearWeekDialogProps) => {
  const weekFormatted = format(weekStart, "MMM d, yyyy");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear Entire Week</DialogTitle>
          <DialogDescription>
            Are you sure you want to clear all items from the week of{" "}
            {weekFormatted}? This action cannot be undone and will remove all
            scheduled items from every day this week.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Clear Week
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
