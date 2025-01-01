import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmScheduleResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (resetAll: boolean) => void;
}

export function ConfirmScheduleResetDialog({
  isOpen,
  onClose,
  onConfirm,
}: ConfirmScheduleResetDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Auto-Scheduled Items</DialogTitle>
          <DialogDescription>
            Choose whether to reset auto-scheduled items for just this week or
            all weeks. Manually added items will not be affected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(false)}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Reset only this week
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(true)}>
            Reset all weeks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
