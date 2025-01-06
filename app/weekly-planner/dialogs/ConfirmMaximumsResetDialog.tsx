import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmMaximumsResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ConfirmMaximumsResetDialog = ({
  isOpen,
  onClose,
  onConfirm,
}: ConfirmMaximumsResetDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Block Maximums</DialogTitle>
          <DialogDescription>
            Are you sure you want to reset all block maximums for this week
            (1,000)? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Reset All</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
