import { Item, ColumnTitles } from "@/typings/types";
import { BaseConfirmDialog } from "./BaseConfirmDialog";

interface ConfirmCompleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  item: Item | null;
  getItemValue: (item: Item, columnName: ColumnTitles) => string;
}

export function ConfirmCompleteDialog({
  isOpen,
  onClose,
  onConfirm,
  item,
  getItemValue,
}: ConfirmCompleteDialogProps) {
  return (
    <BaseConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Complete Item"
      description="Are you sure you want to mark this item as completed?"
      confirmText="Complete"
      confirmVariant="default"
      confirmClassName="bg-green-600 hover:bg-green-700"
    >
      {item && (
        <>
          <p className="font-medium">
            {getItemValue(item, ColumnTitles.Customer_Name)}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {getItemValue(item, ColumnTitles.Design)} -{" "}
            {getItemValue(item, ColumnTitles.Size)}
          </p>
        </>
      )}
    </BaseConfirmDialog>
  );
}
