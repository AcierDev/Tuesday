import { canPauseDueDate, resumeDueDate } from "@/lib/due-date-pause";
import { Item, ItemStatus } from "@/typings/types";

// Fields a board status move (drag / swipe) changes. Undo restores exactly
// these, on top of the latest copy of the order.
type StatusMoveFields = Pick<
  Item,
  | "status"
  | "prevStatus"
  | "completedAt"
  | "onHold"
  | "dueDate"
  | "dueDatePauseOffsetDays"
>;

export function buildStatusMove(
  item: Item,
  newStatus: ItemStatus,
  now: number = Date.now()
): Item {
  const movedItem: Item = {
    ...item,
    status: newStatus,
    prevStatus: null,
    completedAt: newStatus === ItemStatus.Done ? now : undefined,
  };
  // Keep a pause while moving between supported sections (including
  // Packaging → At The Door). Leaving those sections resumes the due date at
  // its current effective value.
  return item.onHold && !canPauseDueDate(newStatus)
    ? resumeDueDate(movedItem)
    : movedItem;
}

export function buildStatusUndo(current: Item, original: Item): Item {
  const restored: StatusMoveFields = {
    status: original.status,
    prevStatus: original.prevStatus,
    completedAt: original.completedAt,
    onHold: original.onHold,
    dueDate: original.dueDate,
    dueDatePauseOffsetDays: original.dueDatePauseOffsetDays,
  };
  return { ...current, ...restored };
}
