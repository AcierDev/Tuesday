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
            This will reset all auto-scheduled items across all weeks. Manually
            added items will not be affected.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => onConfirm(true)}>
            Reset All Weeks
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
