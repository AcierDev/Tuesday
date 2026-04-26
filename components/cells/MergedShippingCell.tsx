"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeftRight,
  Barcode,
  CheckCircle2,
  Package,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useShippingStore } from "@/stores/useShippingStore";
import { useTrackingStore } from "@/stores/useTrackingStore";
import { Item, ItemStatus } from "@/typings/types";
import { TrackingHistory } from "../shipping/TrackingHistory";
import { ViewLabel } from "../shipping/ViewLabel";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 ICON DECISION TREE                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

type MergedAction = "openLabel" | "openTracking";

type MergedIconKind =
  | "barcode-gray"
  | "barcode-yellow"
  | "package-yellow"
  | "truck-blue"
  | "check-green"
  | "alert-red"
  | "return-red"
  | "hidden";

const ICON_SIZE = "h-4 w-4";

const ICON_CONFIG: Record<
  Exclude<MergedIconKind, "hidden">,
  { Icon: React.ComponentType<{ className?: string }>; className: string }
> = {
  "barcode-gray": {
    Icon: Barcode,
    className: "text-muted-foreground",
  },
  "barcode-yellow": {
    Icon: Barcode,
    className: "text-yellow-500",
  },
  "package-yellow": {
    Icon: Package,
    className: "text-yellow-500",
  },
  "truck-blue": {
    Icon: Truck,
    className: "text-blue-500",
  },
  "check-green": {
    Icon: CheckCircle2,
    className: "text-green-500",
  },
  "alert-red": {
    Icon: AlertCircle,
    className: "text-red-500",
  },
  "return-red": {
    Icon: ArrowLeftRight,
    className: "text-red-500",
  },
};

function resolveMergedShippingState(args: {
  status: ItemStatus;
  hasLabel: boolean;
  trackerStatus: string | undefined;
}): { icon: MergedIconKind; action: MergedAction; tooltip: string } {
  const { status, hasLabel, trackerStatus } = args;

  if (status === ItemStatus.Hidden) {
    return { icon: "hidden", action: "openLabel", tooltip: "" };
  }

  if (status === ItemStatus.Done) {
    switch (trackerStatus) {
      case "delivered":
        return {
          icon: "check-green",
          action: "openTracking",
          tooltip: "Delivered",
        };
      case "failure":
      case "error":
      case "cancelled":
        return {
          icon: "alert-red",
          action: "openTracking",
          tooltip: "Shipping Exception",
        };
      case "return_to_sender":
        return {
          icon: "return-red",
          action: "openTracking",
          tooltip: "Return to Sender",
        };
      case "out_for_delivery":
        return {
          icon: "truck-blue",
          action: "openTracking",
          tooltip: "Out for Delivery",
        };
      case "in_transit":
        return {
          icon: "truck-blue",
          action: "openTracking",
          tooltip: "In Transit",
        };
      // pre_transit, undefined, or anything else: not yet picked up.
      // Fall through to the label-state icons.
    }
  }

  if (
    (status === ItemStatus.At_The_Door || status === ItemStatus.Done) &&
    hasLabel
  ) {
    return {
      icon: "package-yellow",
      action: "openLabel",
      tooltip:
        status === ItemStatus.Done ? "Awaiting Pickup" : "At The Door",
    };
  }

  return {
    icon: hasLabel ? "barcode-yellow" : "barcode-gray",
    action: "openLabel",
    tooltip: hasLabel ? "Label uploaded" : "No label",
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📦 MERGED SHIPPING CELL                                               ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

interface MergedShippingCellProps {
  item: Item;
}

export function MergedShippingCell({ item }: MergedShippingCellProps) {
  const [isLabelOpen, setIsLabelOpen] = useState(false);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);

  const hasLabel = useShippingStore((state) => state.hasLabel(item.id));
  const isLoading = useShippingStore((state) => state.isLoading);
  const { trackingInfo } = useTrackingStore();

  const orderTracking = useMemo(
    () => trackingInfo.find((t) => t.orderId === item.id),
    [trackingInfo, item.id]
  );

  const trackerStatus = useMemo(() => {
    const trackers = orderTracking?.trackers;
    if (!trackers || trackers.length === 0) return undefined;
    return trackers[trackers.length - 1]?.status?.toLowerCase();
  }, [orderTracking]);

  const { icon, action, tooltip } = useMemo(
    () =>
      resolveMergedShippingState({
        status: item.status,
        hasLabel,
        trackerStatus,
      }),
    [item.status, hasLabel, trackerStatus]
  );

  if (icon === "hidden") return null;

  const iconConfig = isLoading
    ? {
        Icon: Barcode,
        className: "text-muted-foreground/40",
      }
    : ICON_CONFIG[icon];
  const { Icon, className: iconClassName } = iconConfig;

  const handleClick = () => {
    if (isLoading) return;
    if (action === "openLabel") setIsLabelOpen(true);
    else setIsTrackingOpen(true);
  };

  return (
    <>
      <div className="flex items-center justify-center w-full h-full select-none">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              className="w-8 h-8 p-0 flex items-center justify-center"
              onClick={handleClick}
              disabled={isLoading}
            >
              <Icon className={`${ICON_SIZE} ${iconClassName}`} />
            </Button>
          </TooltipTrigger>
          {tooltip && (
            <TooltipContent>
              <p>{tooltip}</p>
              {orderTracking?.trackers?.[0]?.carrier && (
                <p className="text-xs text-muted-foreground">
                  {orderTracking.trackers[0].carrier}
                </p>
              )}
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {action === "openLabel" && (
        <Dialog open={isLabelOpen} onOpenChange={setIsLabelOpen}>
          <DialogContent className="max-w-4xl bg-secondary text-secondary-foreground border-border">
            <DialogHeader>
              <DialogTitle>Shipping Label</DialogTitle>
            </DialogHeader>
            <ViewLabel
              orderId={item.id}
              item={item}
              onClose={() => setIsLabelOpen(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {action === "openTracking" && (
        <Dialog open={isTrackingOpen} onOpenChange={setIsTrackingOpen}>
          <DialogContent className="max-w-2xl bg-secondary text-secondary-foreground border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold">
                Tracking History
              </DialogTitle>
            </DialogHeader>
            <TrackingHistory tracking={orderTracking} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
