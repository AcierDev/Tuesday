// LabelCell.jsx

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Barcode } from "lucide-react";
import { ViewLabel } from "../shipping/ViewLabel";

export const LabelCell = ({ item, columnValue }) => {
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false);
  const isLabelGenerated = columnValue.text?.toLowerCase() === "true";

  return (
    <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-8 h-8 p-0 text-gray-900 dark:text-gray-100"
          variant="ghost"
          onClick={() => setIsLabelDialogOpen(true)}
        >
          <Barcode
            className={`h-4 w-4 ${
              isLabelGenerated
                ? "text-yellow-500"
                : "text-gray-500 dark:text-gray-400"
            }`}
          />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle>Shipping Label</DialogTitle>
        </DialogHeader>
        <ViewLabel orderId={item.id} />
      </DialogContent>
    </Dialog>
  );
};
