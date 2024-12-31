import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Item, ColumnTitles } from "@/typings/types";

interface ConfirmResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: Item | null;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
}

export function ConfirmResetDialog({
  isOpen,
  onClose,
  onConfirm,
  item,
  getItemValue,
}: ConfirmResetDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle>Reset Item Status</DialogTitle>
        </DialogHeader>
        {item && (
          <div className="py-4 border-b dark:border-gray-700">
            <p className="font-medium">
              {getItemValue(item, ColumnTitles.Customer_Name)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {getItemValue(item, ColumnTitles.Design)} -{" "}
              {getItemValue(item, ColumnTitles.Size)}
            </p>
          </div>
        )}
        <DialogDescription className="pt-4">
          Are you sure you want to reset this item's completion status?
        </DialogDescription>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
