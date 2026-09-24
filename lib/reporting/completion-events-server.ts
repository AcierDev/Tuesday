import type { ClientSession, Db } from "mongodb";

import type { Item } from "../../typings/types";
import type { CompletionEvent } from "./fulfillment";

const COLLECTION_PREFIX = "completion-events";

export function completionEventsCollection(db: Db) {
  return db.collection<CompletionEvent>(`${COLLECTION_PREFIX}-${process.env.NEXT_PUBLIC_MODE}`);
}

export async function ensureCompletionEventIndex(db: Db): Promise<void> {
  await completionEventsCollection(db).createIndex(
    { itemId: 1, completedAt: 1 },
    { unique: true, name: "completion_item_timestamp_unique" }
  );
}

export async function recordCompletionEvent(
  db: Db,
  item: Item,
  completedAt: number,
  dueDateAtCompletion: string | undefined,
  session?: ClientSession
): Promise<void> {
  const collection = completionEventsCollection(db);
  await collection.updateOne(
    { itemId: item.id, completedAt },
    { $setOnInsert: {
      itemId: item.id,
      completedAt,
      createdAt: item.createdAt,
      ...(dueDateAtCompletion ? { dueDateAtCompletion } : {}),
      ...(item.originalDueDate ? { originalDueDate: item.originalDueDate } : {}),
    } },
    { upsert: true, session }
  );
}
