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
import { useOrderTracking } from "@/stores/useTrackingStore";
import { aggregateTrackerStatus } from "@/lib/shipping-labels/tracker-summary";
import { useMemo } from "react";

interface ShippingStatusIconProps {
  orderId: string;
}

export function ShippingStatusIcon({ orderId }: ShippingStatusIconProps) {
  // Subscribe to this order's trackers only, not the whole tracking list.
  const orderTracking = useOrderTracking(orderId);

  // Memoize the status icon calculation which is an expensive operation
  const { icon, text } = useMemo(() => {
    if (!orderTracking || orderTracking.trackers.length === 0) {
      return {
        icon: <Package className="h-4 w-4 text-muted-foreground" />,
        text: "No tracking information",
      };
    }

    // One status across every box: any exception wins, delivered needs all.
    const status = aggregateTrackerStatus(orderTracking.trackers);

    switch (status) {
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
          icon: <Package className="h-4 w-4 text-muted-foreground" />,
          text: status || "Unknown",
        };
    }
  }, [orderTracking]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{icon}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{text}</p>
        {orderTracking?.trackers?.[0]?.carrier && (
          <p className="text-xs text-muted-foreground">
            {orderTracking.trackers[0].carrier}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
