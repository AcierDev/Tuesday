import { ItemStatus, type Item } from "../../typings/types";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function prepareNewItemHistory(item: Item, now: number = Date.now()): Item {
  const { originalDueDate: _ignoredOriginal, dueDateAtCompletion: _ignoredCompletion,
    promiseTrackingStartedAt: _ignoredStart, ...rest } = item;
  return {
    ...rest,
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
    promiseTrackingStartedAt: _ignoredStart, completedAt: _ignoredCompleted, ...updates } = incoming;
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
