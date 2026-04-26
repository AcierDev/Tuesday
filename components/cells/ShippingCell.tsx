import { useState, useMemo } from "react";
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
import Image from "next/image";
import { useShippingStore } from "@/stores/useShippingStore";
import { FedExBuyLabelDialog } from "../shipping/FedExBuyLabelDialog";

interface ShippingCellProps {
  item: Item;
}

export function ShippingCell({ item }: ShippingCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { trackingInfo } = useTrackingStore();
  const hasLabel = useShippingStore((state) => state.hasLabel(item.id));

  // Memoize the tracking lookup
  const { orderTracking, carrier } = useMemo(() => {
    const tracking = trackingInfo.find((t) => t.orderId === item.id);
    return {
      orderTracking: tracking,
      carrier: tracking?.trackers[0]?.carrier,
    };
  }, [trackingInfo, item.id]);

  return (
    <>
      <div className="flex items-center justify-center w-full h-full select-none">
        {hasLabel ? (
          <Button
            variant="ghost"
            className="w-8 h-8 p-0 flex items-center justify-center"
            onClick={() => setIsOpen(true)}
          >
            <div className="flex items-center justify-center">
              <ShippingStatusIcon orderId={item.id} />
            </div>
          </Button>
        ) : (
          <FedExBuyLabelDialog item={item} />
        )}
      </div>

      {hasLabel ? (
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
      ) : null}
    </>
  );
}
