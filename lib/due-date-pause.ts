import { dayDiffKeys, laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import { Item, ItemStatus } from "@/typings/types";

const DAY_KEY_TEMPLATE = "YYYY-MM-DD";
const DAY_KEY_LENGTH = DAY_KEY_TEMPLATE.length;
const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const DUE_DATE_PAUSABLE_STATUSES: ReadonlySet<ItemStatus> = new Set([
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
]);

function dueDateKey(value: string | undefined): string | null {
  if (!value) return null;
  const key = value.slice(0, DAY_KEY_LENGTH);
  return DAY_KEY_PATTERN.test(key) ? key : null;
}

export function canPauseDueDate(status: ItemStatus): boolean {
  return DUE_DATE_PAUSABLE_STATUSES.has(status);
}

export function hasStoredDueDatePauseOffset(
  item: Pick<Item, "dueDatePauseOffsetDays">
): boolean {
  return (
    typeof item.dueDatePauseOffsetDays === "number" &&
    Number.isFinite(item.dueDatePauseOffsetDays)
  );
}

function pauseOffsetDays(
  item: Pick<Item, "dueDate" | "dueDatePauseOffsetDays">,
  todayKey: string
): number | null {
  const storedOffset = item.dueDatePauseOffsetDays;
  if (typeof storedOffset === "number" && Number.isFinite(storedOffset)) {
    return Math.trunc(storedOffset);
  }

  // Legacy held items predate the persisted offset. Treat the first day this
  // code sees them as the pause baseline; the items API persists that offset.
  const dueKey = dueDateKey(item.dueDate);
  if (!dueKey) return null;
  const offset = dayDiffKeys(todayKey, dueKey);
  return Number.isFinite(offset) ? offset : null;
}

// A paused date is always `offset` calendar days from today. This remains true
// across reloads, long periods with no browser open, and daylight-saving time.
export function getEffectiveDueDateKey(
  item: Pick<Item, "dueDate" | "onHold" | "dueDatePauseOffsetDays">,
  todayKey: string = laDayKey()
): string | null {
  const storedDueKey = dueDateKey(item.dueDate);
  if (!item.onHold) return storedDueKey;

  const offset = pauseOffsetDays(item, todayKey);
  return offset === null ? storedDueKey : shiftDayKey(todayKey, offset);
}

export function pauseDueDate(
  item: Item,
  todayKey: string = laDayKey()
): Item {
  const effectiveDueKey = getEffectiveDueDateKey(item, todayKey);
  const offset = effectiveDueKey
    ? dayDiffKeys(todayKey, effectiveDueKey)
    : null;

  return {
    ...item,
    dueDate: effectiveDueKey ?? item.dueDate,
    onHold: true,
    dueDatePauseOffsetDays: offset,
  };
}

export function resumeDueDate(
  item: Item,
  todayKey: string = laDayKey()
): Item {
  const effectiveDueKey = getEffectiveDueDateKey(item, todayKey);
  return {
    ...item,
    dueDate: effectiveDueKey ?? item.dueDate,
    onHold: false,
    dueDatePauseOffsetDays: null,
  };
}

// Editing a date while it is paused establishes a new fixed days-remaining
// offset from the day of the edit.
export function updatePausedDueDate(
  item: Item,
  dueDate: string,
  todayKey: string = laDayKey()
): Item {
  if (!item.onHold) return { ...item, dueDate };

  const dueKey = dueDateKey(dueDate);
  if (!dueKey) {
    return {
      ...item,
      dueDate,
      onHold: false,
      dueDatePauseOffsetDays: null,
    };
  }

  return {
    ...item,
    dueDate,
    dueDatePauseOffsetDays: dayDiffKeys(todayKey, dueKey),
  };
}
