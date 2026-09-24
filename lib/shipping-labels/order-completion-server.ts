import type { Db } from "mongodb";

import { logActivity } from "@/app/api/activities/log";
import { getEffectiveDueDateKey } from "@/lib/due-date-pause";
import {
  ensureCompletionEventIndex,
  recordCompletionEvent,
} from "@/lib/reporting/completion-events-server";
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
      await ensureCompletionEventIndex(db);
      const session = db.client.startSession();
      let completedItem: Item | null = null;
      try {
        completedItem = await session.withTransaction(async () => {
          const currentItem = await items.findOne({ id: item.id }, { session });
          if (!currentItem || [ItemStatus.Done, ItemStatus.Hidden].includes(currentItem.status)) {
            return null;
          }
          const dueDateAtCompletion = getEffectiveDueDateKey(currentItem) ?? currentItem.dueDate;
          await items.updateOne(
            { _id: currentItem._id },
            { $set: {
              status: ItemStatus.Done,
              prevStatus: currentItem.status,
              completedAt,
              dueDateAtCompletion,
            } },
            { session }
          );
          await recordCompletionEvent(
            db,
            currentItem,
            completedAt,
            dueDateAtCompletion,
            session
          );
          return currentItem;
        });
      } finally {
        await session.endSession();
      }
      if (!completedItem) return false;

      await logActivity(db, {
        itemId: item.id,
        type: "status_change",
        changes: [
          {
            field: "status",
            oldValue: completedItem.status,
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
