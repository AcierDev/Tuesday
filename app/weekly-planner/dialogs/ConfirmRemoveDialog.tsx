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

interface ConfirmRemoveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: Item | null;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
}

export function ConfirmRemoveDialog({
  isOpen,
  onClose,
  onConfirm,
  item,
  getItemValue,
}: ConfirmRemoveDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle>Remove Item</DialogTitle>
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
          Are you sure you want to remove this item from the schedule?
        </DialogDescription>
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
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
