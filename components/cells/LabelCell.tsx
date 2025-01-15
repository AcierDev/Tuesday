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
import { Item } from "@/typings/types";
import { useShippingStore } from "@/stores/useShippingStore";

export const LabelCell = ({ item }: { item: Item }) => {
  const [isLabelDialogOpen, setIsLabelDialogOpen] = useState(false);
  const isLoading = useShippingStore((state) => state.isLoading);
  const hasLabel = useShippingStore((state) => state.hasLabel(item.id));

  return (
    <Dialog open={isLabelDialogOpen} onOpenChange={setIsLabelDialogOpen}>
      <DialogTrigger asChild>
        <Button
          className="w-8 h-8 p-0 text-gray-900 dark:text-gray-100"
          variant="ghost"
          onClick={() => setIsLabelDialogOpen(true)}
          disabled={isLoading}
        >
          <Barcode
            className={`h-4 w-4 ${
              isLoading
                ? "text-gray-300"
                : hasLabel
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
        <ViewLabel
          orderId={item.id}
          onClose={() => setIsLabelDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
