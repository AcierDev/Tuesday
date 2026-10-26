import type { Document } from "mongodb";

import type {
  OrderTrackingInfo,
  Tracker,
  TrackerStatus,
  TrackingDetail,
} from "@/typings/types";

// The orders page only needs each tracker's identity and current status.
// Full scan histories are fetched per order when Tracking History opens.
export const TRACKER_SUMMARY_FIELDS = [
  "id",
  "tracking_code",
  "status",
  "status_detail",
  "carrier",
  "est_delivery_date",
  "public_url",
  "created_at",
  "updated_at",
] as const;

// Delivered scans are kept so delivery-speed stats keep working on the lean list.
const SUMMARY_DETAIL_STATUS: TrackerStatus = "delivered";

export const EASYPOST_TRACKER_ID_PREFIX = "trk_";

export function isEasyPostTrackerId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > EASYPOST_TRACKER_ID_PREFIX.length &&
    value.startsWith(EASYPOST_TRACKER_ID_PREFIX)
  );
}

/** Lean tracker shape served to the orders page; mirrors the Mongo projection below. */
export function projectTrackerSummary(tracker: Tracker): Tracker {
  const summary: Record<string, unknown> = {};
  for (const field of TRACKER_SUMMARY_FIELDS) {
    if (tracker[field] !== undefined) summary[field] = tracker[field];
  }
  summary.tracking_details = (tracker.tracking_details ?? [])
    .filter((detail) => detail?.status === SUMMARY_DETAIL_STATUS)
    .map((detail) => ({ status: detail.status, datetime: detail.datetime }));
  return summary as Tracker;
}

export function projectOrderTrackingSummary(
  info: OrderTrackingInfo
): OrderTrackingInfo {
  return {
    orderId: info.orderId,
    trackers: (info.trackers ?? []).map(projectTrackerSummary),
  };
}

/** Aggregation stage producing the same lean shape as projectTrackerSummary. */
export function trackerSummaryProjectionStage(): Document {
  const trackerFields = Object.fromEntries(
    TRACKER_SUMMARY_FIELDS.map((field) => [field, `$$tracker.${field}`])
  );
  return {
    $project: {
      _id: 0,
      orderId: 1,
      trackers: {
        $map: {
          input: { $ifNull: ["$trackers", []] },
          as: "tracker",
          in: {
            ...trackerFields,
            tracking_details: {
              $map: {
                input: {
                  $filter: {
                    input: { $ifNull: ["$$tracker.tracking_details", []] },
                    as: "detail",
                    cond: { $eq: ["$$detail.status", SUMMARY_DETAIL_STATUS] },
                  },
                },
                as: "detail",
                in: { status: "$$detail.status", datetime: "$$detail.datetime" },
              },
            },
          },
        },
      },
    },
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📊 ORDER-LEVEL STATUS                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const RETURN_STATUSES: ReadonlySet<string> = new Set(["return_to_sender"]);
const EXCEPTION_STATUSES: ReadonlySet<string> = new Set([
  "failure",
  "error",
  "cancelled",
]);
// Most advanced movement wins when some boxes are still on the way.
const MOVING_STATUS_PRIORITY: readonly TrackerStatus[] = [
  "out_for_delivery",
  "in_transit",
  "available_for_pickup",
];

/**
 * One status for an order with several boxes: a return or exception on any
 * box wins, and the order is delivered only once every box is delivered.
 */
export function aggregateTrackerStatus(
  trackers: Pick<Tracker, "status">[] | undefined
): TrackerStatus | undefined {
  const statuses = (trackers ?? [])
    .map((tracker) => tracker?.status?.toLowerCase())
    .filter((status): status is TrackerStatus => Boolean(status));
  if (statuses.length === 0) return undefined;

  const returned = statuses.find((status) => RETURN_STATUSES.has(status));
  if (returned) return returned;
  const exception = statuses.find((status) => EXCEPTION_STATUSES.has(status));
  if (exception) return exception;
  if (statuses.every((status) => status === "delivered")) return "delivered";

  for (const status of MOVING_STATUS_PRIORITY) {
    if (statuses.includes(status)) return status;
  }
  // Some boxes delivered while others have no scans yet: still on the way.
  if (statuses.includes("delivered")) return "in_transit";
  if (statuses.includes("pre_transit")) return "pre_transit";
  return "unknown";
}

export function trackerScansNewestFirst(
  details: TrackingDetail[] | undefined
): TrackingDetail[] {
  return [...(details ?? [])].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
  );
}
