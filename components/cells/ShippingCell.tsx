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
import Image from "next/image";

interface ShippingCellProps {
  item: Item;
}

export function ShippingCell({ item }: ShippingCellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { trackingInfo } = useTrackingStore();
  const orderTracking = trackingInfo.find((t) => t.orderId === item.id);
  const carrier = orderTracking?.trackers[0]?.carrier;

  return (
    <>
      <div className="flex items-center justify-center w-full h-full">
        <Button
          variant="ghost"
          className="w-8 h-8 p-0 flex items-center justify-center"
          onClick={() => setIsOpen(true)}
        >
          <div className="flex items-center justify-center gap-1">
            <ShippingStatusIcon orderId={item.id} />
            {carrier === "UPS" && (
              <Image
                src="/icons/ups.png"
                alt="UPS"
                width={24}
                height={24}
                className="w-4 h-4"
              />
            )}
            {carrier === "FedExDefault" && (
              <Image
                src="/icons/fedex.webp"
                alt="FedEx"
                width={32}
                height={32}
                className="w-4 h-4"
              />
            )}
          </div>
        </Button>
      </div>

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
