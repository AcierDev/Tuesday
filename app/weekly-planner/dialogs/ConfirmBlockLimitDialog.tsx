import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfirmBlockLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  totalBlocks: number;
  newBlocks: number;
  blockLimit?: number;
}

export const ConfirmBlockLimitDialog: React.FC<
  ConfirmBlockLimitDialogProps
> = ({
  isOpen,
  onClose,
  onConfirm,
  totalBlocks,
  newBlocks,
  blockLimit = 1000,
}) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block Limit Warning</AlertDialogTitle>
          <AlertDialogDescription>
            Adding this item will exceed the maximum block limit for this day.
            <br />
            <br />
            Current blocks: {totalBlocks}
            <br />
            Adding: {newBlocks}
            <br />
            Total after adding: {totalBlocks + newBlocks}
            <br />
            This day's maximum: {blockLimit}
            <br />
            <br />
            Would you like to proceed anyway?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Proceed</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
