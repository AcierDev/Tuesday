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
}

export const ConfirmBlockLimitDialog: React.FC<
  ConfirmBlockLimitDialogProps
> = ({ isOpen, onClose, onConfirm, totalBlocks, newBlocks }) => {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Block Limit Warning</AlertDialogTitle>
          <AlertDialogDescription>
            Adding this item will bring the total block count to{" "}
            {totalBlocks + newBlocks}
            (current: {totalBlocks}, adding: {newBlocks}).
            <br />
            <br />
            It is not recommended to exceed 1,000 blocks per day. Would you like
            to proceed anyway?
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
