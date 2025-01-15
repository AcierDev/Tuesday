import { useState } from "react";
import { useTrackingStore } from "@/stores/useTrackingStore";
import { ShippingStatusIcon } from "../orders/ShippingStatusIcon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TrackingHistory } from "../shipping/TrackingHistory";
import { Item } from "@/typings/types";

interface ShippingCellProps {
  item: Item;
}

export function ShippingCell({ item }: ShippingCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { trackingInfo } = useTrackingStore();
  const orderTracking = trackingInfo.find((t) => t.orderId === item.id);

  return (
    <>
      <Button
        variant="ghost"
        className="w-8 h-8 p-0"
        onClick={() => setIsOpen(true)}
      >
        <ShippingStatusIcon orderId={item.id} />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Tracking History
            </DialogTitle>
          </DialogHeader>
          <TrackingHistory tracking={orderTracking} />
        </DialogContent>
      </Dialog>
    </>
  );
}
