import type { Db, Document } from "mongodb";

import type { OrderTrackingInfo, Tracker } from "@/typings/types";

export function mergeTrackerProjection(
  existing: Tracker[],
  incoming: Tracker
): Tracker[] {
  return [
    ...existing.filter(
      (tracker) =>
        tracker.id !== incoming.id &&
        tracker.tracking_code !== incoming.tracking_code
    ),
    incoming,
  ];
}

export async function upsertTrackerProjection(
  db: Db,
  orderId: string,
  tracker: Tracker
): Promise<void> {
  const collection = db.collection<OrderTrackingInfo>(
    `trackers-${process.env.NEXT_PUBLIC_MODE}`
  );
  const updatePipeline: Document[] = [
    {
      $set: {
        orderId,
        trackers: {
          $concatArrays: [
            {
              $filter: {
                input: { $ifNull: ["$trackers", []] },
                as: "existingTracker",
                cond: {
                  $and: [
                    { $ne: ["$$existingTracker.id", tracker.id] },
                    {
                      $ne: [
                        "$$existingTracker.tracking_code",
                        tracker.tracking_code,
                      ],
                    },
                  ],
                },
              },
            },
            [{ $literal: tracker }],
          ],
        },
      },
    },
  ];

  await collection.updateOne({ orderId }, updatePipeline, { upsert: true });
}
