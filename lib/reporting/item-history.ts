import { ItemStatus, type Item } from "../../typings/types";
import { normalizeOrderWipPatch } from "../order-wip";
import { normalizeNewOrderOrientation, normalizeOrderOrientationPatch } from "../order-orientation";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
// Snapshot taken when an order moves to Done. Reopening clears it so the order
// stops counting as completed; the next completion records fresh values.
const COMPLETION_FIELDS = ["completedAt", "dueDateAtCompletion"] as const;

export function prepareNewItemHistory(item: Item, now: number = Date.now()): Item {
  const { originalDueDate: _ignoredOriginal, dueDateAtCompletion: _ignoredCompletion,
    promiseTrackingStartedAt: _ignoredStart, ...rest } = item;
  return {
    ...normalizeNewOrderOrientation(rest),
    promiseTrackingStartedAt: now,
    originalDueDate: item.dueDate && DATE_PATTERN.test(item.dueDate)
      ? item.dueDate
      : undefined,
  };
}

export function prepareItemPatchHistory(
  current: Item,
  incoming: Partial<Item>,
  now: number
): Partial<Item> {
  const { originalDueDate: _ignoredOriginal, dueDateAtCompletion: _ignoredCompletion,
    promiseTrackingStartedAt: _ignoredStart, completedAt: _ignoredCompleted, ...rawUpdates } = incoming;
  const updates = normalizeOrderOrientationPatch(current, normalizeOrderWipPatch(current, rawUpdates));
  const firstPromise = current.promiseTrackingStartedAt != null &&
    !current.originalDueDate && !current.dueDate &&
    updates.dueDate && DATE_PATTERN.test(updates.dueDate)
      ? { originalDueDate: updates.dueDate }
      : {};
  if (current.status !== ItemStatus.Done && updates.status === ItemStatus.Done) {
    return {
      ...updates,
      ...firstPromise,
      completedAt: now,
      ...(updates.dueDate ?? current.dueDate
        ? { dueDateAtCompletion: updates.dueDate ?? current.dueDate }
        : {}),
    };
  }
  return { ...updates, ...firstPromise };
}

export function itemPatchFieldsToClear(current: Item, updates: Partial<Item>): (keyof Item)[] {
  const reopened = current.status === ItemStatus.Done &&
    updates.status !== undefined && updates.status !== ItemStatus.Done;
  return reopened ? [...COMPLETION_FIELDS] : [];
}
