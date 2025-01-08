import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ConfirmWeekResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  weekStart: Date;
}

export function ConfirmWeekResetDialog({
  isOpen,
  onClose,
  onConfirm,
  weekStart,
}: ConfirmWeekResetDialogProps) {
  const weekFormatted = format(weekStart, "MMM d, yyyy");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Current Week</DialogTitle>
          <DialogDescription>
            This will reset all auto-scheduled items for the week of{" "}
            {weekFormatted}. Manually added items will not be affected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="bg-yellow-600 hover:bg-yellow-700"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Reset This Week
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
