import type { Item } from "../typings/types";
import { getEffectiveDueDateKey } from "./due-date-pause";

// Values the browser derives (search index, planner membership) or the database
// owns. They are never written from a client request.
export const DERIVED_ITEM_FIELDS = ["_id", "searchText", "isScheduled"] as const;

// Persisted copies of derived values left by older migrations. Item writes
// remove them so stale search text never comes back from the database.
export const LEGACY_STORED_DERIVED_FIELDS = ["searchText", "isScheduled"] as const;

// Set by the server (completion and promise history, deletion time). A client
// copy may hold a locally guessed value, so they never decide a conflict.
const SERVER_OWNED_ITEM_FIELDS: ReadonlySet<string> = new Set([
  "completedAt", "dueDateAtCompletion", "originalDueDate",
  "promiseTrackingStartedAt", "deletedAt",
]);

type ItemRecord = Record<string, unknown>;

export type ItemPatch = {
  updates: Partial<Item>;
  // The value this client last saw for every updated field. The server refuses
  // the write when the stored value has changed since (another edit won).
  expected: Partial<Item>;
};

export function stripDerivedItemFields<T extends object>(item: T): T {
  const writable = { ...item } as ItemRecord;
  for (const field of DERIVED_ITEM_FIELDS) delete writable[field];
  return writable as T;
}

function isPlainObject(value: unknown): value is ItemRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Deep equality where a missing value, undefined and null are the same thing
// (JSON drops undefined, Mongo stores null) and object key order is ignored.
export function itemValuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (Array.isArray(a) || Array.isArray(b)) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
      a.every((value, index) => itemValuesEqual(value, b[index]));
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((key) => itemValuesEqual(a[key], b[key]));
  }
  return false;
}

// Only the fields that differ from what this client last saw are sent, so two
// people editing different fields of one order never overwrite each other.
// `onlyFields` limits the patch to the fields a caller actually edited, which
// protects against a caller holding an older copy of the rest of the order.
export function buildItemPatch(
  previous: Item,
  next: Item,
  onlyFields?: ReadonlySet<string>
): ItemPatch {
  const before = previous as unknown as ItemRecord;
  const after = stripDerivedItemFields(next) as unknown as ItemRecord;
  const updates: ItemRecord = {};
  const expected: ItemRecord = {};
  for (const [field, value] of Object.entries(after)) {
    if (field === "id" || value === undefined) continue;
    if (onlyFields && !onlyFields.has(field)) continue;
    if (itemValuesEqual(before[field], value)) continue;
    updates[field] = value;
    if (!SERVER_OWNED_ITEM_FIELDS.has(field)) expected[field] = before[field] ?? null;
  }
  // While a due date is paused the browser shows today + offset, not the stored
  // date. Pausing or resuming must persist the date the user is looking at.
  if (Boolean(previous.onHold) !== Boolean(next.onHold) &&
    next.dueDate !== undefined && !("dueDate" in updates)) {
    updates.dueDate = next.dueDate;
    expected.dueDate = previous.dueDate ?? null;
  }
  return { updates: updates as Partial<Item>, expected: expected as Partial<Item> };
}

// Fields whose stored value no longer matches what the client expected. The
// due date is compared as the client sees it (effective date, day key only).
export function findItemPatchConflicts(stored: Item, expected: Partial<Item>): string[] {
  const storedRecord = stored as unknown as ItemRecord;
  return Object.entries(expected as ItemRecord)
    .filter(([field]) => !SERVER_OWNED_ITEM_FIELDS.has(field))
    .filter(([field, value]) => {
      const storedValue = field === "dueDate"
        ? getEffectiveDueDateKey(stored) ?? stored.dueDate
        : storedRecord[field];
      return !itemValuesEqual(storedValue, value);
    })
    .map(([field]) => field);
}
