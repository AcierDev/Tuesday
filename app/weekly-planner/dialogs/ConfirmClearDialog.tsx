import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DayName } from "@/typings/types";

interface ConfirmClearDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  day: DayName | null;
}

export const ConfirmClearDialog = ({
  isOpen,
  onClose,
  onConfirm,
  day,
}: ConfirmClearDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Clear {day}</DialogTitle>
          <DialogDescription>
            Are you sure you want to clear all items from {day}? This action
            cannot be undone.
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
            Clear Day
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
