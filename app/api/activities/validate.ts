import type { ActivityChange, ActivityType, BaseActivity } from "@/typings/types";

export const ACTIVITY_MAX_BODY_BYTES = 32_768;
export const ACTIVITY_MAX_CHANGES = 50;
export const ACTIVITY_MAX_ID_LENGTH = 200;
export const ACTIVITY_MAX_FIELD_LENGTH = 100;
export const ACTIVITY_MAX_VALUE_LENGTH = 2_000;
export const ACTIVITY_MAX_METADATA_LENGTH = 300;
export const ACTIVITIES_DEFAULT_LIMIT = 50;
// The stats pages request up to 5000 records at once.
export const ACTIVITIES_MAX_LIMIT = 5_000;
export const ACTIVITIES_MAX_SKIP = 100_000;

const ACTIVITY_TYPES = new Set<ActivityType>(["update", "create", "delete", "status_change", "restore"]);
const METADATA_FIELDS = ["customerName", "design", "size"] as const;

const record = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const boundedString = (value: unknown, maxLength: number): value is string =>
  typeof value === "string" && value.length <= maxLength;

/** Keeps only the known activity fields; returns null when any is malformed. */
export function parseActivityInput(value: unknown): Omit<BaseActivity, "id" | "timestamp"> | null {
  const input = record(value);
  if (!input || !boundedString(input.itemId, ACTIVITY_MAX_ID_LENGTH) || !input.itemId.trim()
    || !ACTIVITY_TYPES.has(input.type as ActivityType)
    || !Array.isArray(input.changes) || input.changes.length > ACTIVITY_MAX_CHANGES) return null;

  const changes: ActivityChange[] = [];
  for (const value of input.changes) {
    const change = record(value);
    if (!change || !boundedString(change.field, ACTIVITY_MAX_FIELD_LENGTH) || !change.field
      || !boundedString(change.newValue, ACTIVITY_MAX_VALUE_LENGTH)
      || (change.oldValue !== undefined && !boundedString(change.oldValue, ACTIVITY_MAX_VALUE_LENGTH))
      || (change.isRestore !== undefined && typeof change.isRestore !== "boolean")) return null;
    changes.push({
      field: change.field as ActivityChange["field"], newValue: change.newValue,
      ...(change.oldValue !== undefined ? { oldValue: change.oldValue as string } : {}),
      ...(change.isRestore !== undefined ? { isRestore: change.isRestore as boolean } : {}),
    });
  }

  let metadata: BaseActivity["metadata"];
  if (input.metadata !== undefined) {
    const source = record(input.metadata);
    if (!source) return null;
    metadata = {};
    for (const field of METADATA_FIELDS) {
      const entry = source[field];
      if (entry === undefined) continue;
      if (!boundedString(entry, ACTIVITY_MAX_METADATA_LENGTH)) return null;
      metadata[field] = entry;
    }
  }

  return { itemId: input.itemId, type: input.type as ActivityType, changes, ...(metadata ? { metadata } : {}) };
}

/** Parses an integer query value; missing or malformed values use the fallback. */
export function clampedInteger(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = raw === null || !/^\s*-?\d+\s*$/.test(raw) ? fallback : Number.parseInt(raw, 10);
  return Math.min(Math.max(parsed, min), max);
}
