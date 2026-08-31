import type { Db } from "mongodb";

import { logActivity } from "@/app/api/activities/log";
import { ItemStatus, type Item } from "@/typings/types";
import type { FutureLabelCompletionDeps } from "./order-completion";
import { listShippingLabels } from "./repository";

export function createFutureLabelCompletionDeps(
  db: Db
): FutureLabelCompletionDeps {
  const items = db.collection<Item>(
    `items-${process.env.NEXT_PUBLIC_MODE}`
  );

  return {
    listLabels: (orderId) => listShippingLabels(db, orderId),
    getOrder: (orderId) => items.findOne({ id: orderId }),
    completeOrder: async (item, completedAt) => {
      const previousStatus = item.status;
      const result = await items.updateOne(
        {
          id: item.id,
          status: { $nin: [ItemStatus.Done, ItemStatus.Hidden] },
        },
        {
          $set: {
            status: ItemStatus.Done,
            prevStatus: previousStatus,
            completedAt,
          },
        }
      );
      if (result.modifiedCount === 0) return false;

      await logActivity(db, {
        itemId: item.id,
        type: "status_change",
        changes: [
          {
            field: "status",
            oldValue: previousStatus,
            newValue: ItemStatus.Done,
          },
        ],
        metadata: {
          customerName: item.customerName,
          design: item.design,
          size: item.size,
        },
      });
      return true;
    },
    now: Date.now,
  };
}
