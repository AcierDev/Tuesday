import {
  Package,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTrackingStore } from "@/stores/useTrackingStore";
import { useMemo } from "react";

interface ShippingStatusIconProps {
  orderId: string;
}

export function ShippingStatusIcon({ orderId }: ShippingStatusIconProps) {
  const { trackingInfo } = useTrackingStore();

  // Memoize the tracking info lookup
  const orderTracking = useMemo(() => {
    return trackingInfo.find((t) => t.orderId === orderId);
  }, [trackingInfo, orderId]);

  // Memoize the status icon calculation which is an expensive operation
  const { icon, text } = useMemo(() => {
    if (!orderTracking || orderTracking.trackers.length === 0) {
      return {
        icon: <Package className="h-4 w-4 text-gray-400" />,
        text: "No tracking information",
      };
    }

    // Use the most recent tracker
    const latestTracker =
      orderTracking.trackers[orderTracking.trackers.length - 1];

    switch (latestTracker?.status?.toLowerCase()) {
      case "delivered":
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
          text: "Delivered",
        };
      case "out_for_delivery":
        return {
          icon: <Truck className="h-4 w-4 text-blue-500" />,
          text: "Out for Delivery",
        };
      case "in_transit":
        return {
          icon: <Truck className="h-4 w-4 text-blue-500" />,
          text: "In Transit",
        };
      case "pre_transit":
        return {
          icon: <Package className="h-4 w-4 text-yellow-500" />,
          text: "Label Created",
        };
      case "failure":
      case "cancelled":
      case "error":
        return {
          icon: <AlertCircle className="h-4 w-4 text-red-500" />,
          text: "Shipping Exception",
        };
      case "return_to_sender":
        return {
          icon: <ArrowLeftRight className="h-4 w-4 text-red-500" />,
          text: "Return to Sender",
        };
      default:
        return {
          icon: <Package className="h-4 w-4 text-gray-400" />,
          text: latestTracker?.status || "Unknown",
        };
    }
  }, [orderTracking]);

  return (
    <Tooltip>
      <TooltipTrigger>{icon}</TooltipTrigger>
      <TooltipContent>
        <p>{text}</p>
        {orderTracking?.trackers?.[0]?.carrier && (
          <p className="text-xs text-gray-500">
            {orderTracking.trackers[0].carrier}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
