import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  Package,
  Truck,
  MapPin,
  Calendar,
  Clock,
} from "lucide-react";
import { OrderTrackingInfo } from "@/typings/types";
import { TrackingDetail } from "@/typings/types";
import { useState, useRef } from "react";

interface TrackingHistoryProps {
  tracking?: OrderTrackingInfo;
}

export function TrackingHistory({ tracking }: TrackingHistoryProps) {
  const [showAll, setShowAll] = useState(false);

  // Add ref for the container
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle show more/less click with smooth scroll
  const handleShowMoreClick = () => {
    setShowAll(!showAll);

    // If we're showing less, scroll back to the top of the container
    if (showAll) {
      containerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

  if (!tracking || !tracking.trackers.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Package className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">
          No tracking information available
        </p>
      </div>
    );
  }

  const latestTracker = tracking.trackers[tracking.trackers.length - 1];
  const details = latestTracker.tracking_details.sort(
    (a: TrackingDetail, b: TrackingDetail) =>
      new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
  );

  const displayedDetails = showAll ? details : details.slice(0, 5);

  return (
    <div
      ref={containerRef}
      className="space-y-6 p-4 max-h-[80vh] overflow-y-auto"
    >
      {/* Current Status Card */}
      <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-lg p-6 shadow-sm border border-blue-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/15 rounded-full">
              <Truck className="h-5 w-5 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-foreground">
                {latestTracker.carrier}
              </h3>
              <p className="text-sm text-muted-foreground">
                {latestTracker.tracking_code}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">
                Estimated Delivery
              </p>
              <p className="text-sm text-muted-foreground">
                {latestTracker.est_delivery_date
                  ? format(
                      new Date(latestTracker.est_delivery_date),
                      "MMM d, yyyy"
                    )
                  : "Not available"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {displayedDetails.map((detail: TrackingDetail, index: number) => (
          <motion.div
            key={`${detail.datetime}-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 relative z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === 0 ? "bg-blue-500/15" : "bg-muted"
                  }`}
                >
                  {index === 0 ? (
                    <Truck
                      className={`h-4 w-4 ${
                        index === 0
                          ? "text-blue-500 dark:text-blue-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  ) : (
                    <MapPin
                      className={`h-4 w-4 ${
                        index === 0
                          ? "text-blue-500 dark:text-blue-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  )}
                </div>
              </div>

              <div className="flex-grow bg-muted/40 rounded-lg p-4 shadow-sm border border-border">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-start">
                    <p
                      className={`font-medium ${
                        index === 0
                          ? "text-blue-500 dark:text-blue-400"
                          : "text-foreground"
                      }`}
                    >
                      {detail.message}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                      {detail.tracking_location && (
                        <span>
                          {detail.tracking_location.city}
                          {detail.tracking_location.city && ", "}
                          {detail.tracking_location.state}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(detail.datetime), "MMM d")}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          {format(new Date(detail.datetime), "h:mm a")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Show More Button */}
        {details.length > 5 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <button
              onClick={handleShowMoreClick}
              className="sticky bottom-0 w-full mt-4 py-3 px-4 bg-muted/60
                hover:bg-muted
                text-muted-foreground
                rounded-lg transition-colors duration-200
                flex items-center justify-center space-x-2
                border border-border
                backdrop-blur-sm"
            >
              <span>
                {showAll
                  ? "Show Less"
                  : `Show ${details.length - 5} More Updates`}
              </span>
              <motion.span
                animate={{ rotate: showAll ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                ↓
              </motion.span>
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
