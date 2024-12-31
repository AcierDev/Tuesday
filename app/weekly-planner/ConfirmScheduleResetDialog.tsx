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
  onConfirm: () => void;
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
            This will remove auto-scheduled items only. Manually added items
            will not be affected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Reset Auto-Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
