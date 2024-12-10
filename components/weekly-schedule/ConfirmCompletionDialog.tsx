import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from "../ui/dialog";
import { ColumnTitles, Item } from "@/typings/types";
import { Button } from "../ui/button";

interface ConfirmCompletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  handleMarkAsCompleted: (item: Item) => void;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
}

export function ConfirmCompletionDialog({
  isOpen,
  onClose,
  item,
  handleMarkAsCompleted,
  getItemValue,
}: ConfirmCompletionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] dark:bg-gray-800">
        <DialogHeader>
          <DialogTitle>Confirm Completion</DialogTitle>
          <DialogDescription>
            Are you sure you want to mark this item as completed?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {item && (
            <div>
              <p className="font-semibold">
                {getItemValue(item, ColumnTitles.Customer_Name)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {getItemValue(item, ColumnTitles.Design)} -{" "}
                {getItemValue(item, ColumnTitles.Size)}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => item && handleMarkAsCompleted(item)}>
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
