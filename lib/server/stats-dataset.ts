import type { Document, ObjectId } from "mongodb";

import { getDb } from "@/app/api/db/connect";
import { getEffectiveDueDateKey } from "@/lib/due-date-pause";
import { trackerSummaryProjectionStage } from "@/lib/shipping-labels/tracker-summary";
import { createTtlCache, type TtlCacheReadOptions } from "@/lib/server/ttl-cache";
import type { Activity, Item, OrderTrackingInfo } from "@/typings/types";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// All-history sources behind the stats views, cached per server process.
// The browser asks for fresh data after it sees a write (see
// STATS_SERVER_CACHE_TTL_MS in lib/stats-shared, which must be >= this).
export const STATS_DATASET_TTL_MS = 30_000;
// A fresh read may share a load started this long before it (one page's burst
// of view requests after an edit). Well under the client's invalidation
// debounce, so the shared load always started after the write committed.
export const STATS_FRESH_JOIN_WINDOW_MS = 500;
// Refreshes of the status history fetch only activities newer than the
// newest one held, minus this overlap (absorbs inserts that committed out of
// timestamp order across server processes).
export const ACTIVITY_REFRESH_OVERLAP_MS = 5 * 60_000;
// Incremental refreshes are replaced by a full reload this often.
export const ACTIVITY_FULL_RELOAD_MS = 30 * 60_000;

// Every field a stats view reads. Same population as the old client fetch
// (/api/items?includeDone=true&includeHidden=true): visible, not deleted, and
// held items excluded everywhere.
const STATS_ITEM_PROJECTION = {
  _id: 0,
  id: 1,
  dueDate: 1,
  status: 1,
  completedAt: 1,
  createdAt: 1,
  design: 1,
  size: 1,
  customerName: 1,
  onHold: 1,
  dueDatePauseOffsetDays: 1,
  purchasedShipment: 1,
  purchasedShipments: 1,
  shippingDetails: 1,
} as const;
const STATS_ITEM_FILTER = {
  visible: true,
  deleted: false,
  onHold: { $ne: true },
} as const;

const STATUS_ACTIVITY_PROJECTION = {
  _id: 1,
  itemId: 1,
  type: 1,
  timestamp: 1,
  changes: 1,
} as const;

const mode = () => process.env.NEXT_PUBLIC_MODE;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📦 ITEMS                                                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Due dates read exactly as /api/items returns them (YYYY-MM-DD keys).
function withEffectiveDueDate(item: Item): Item {
  const effective = getEffectiveDueDateKey(item);
  return effective && effective !== item.dueDate
    ? { ...item, dueDate: effective }
    : item;
}

async function loadStatsItems(): Promise<Item[]> {
  const db = await getDb();
  const items = (await db
    .collection<Item>(`items-${mode()}`)
    .find(STATS_ITEM_FILTER, { projection: STATS_ITEM_PROJECTION })
    .toArray()) as unknown as Item[];
  return items.map(withEffectiveDueDate);
}

const itemsCache = createTtlCache<"items", Item[]>(() => loadStatsItems(), {
  ttlMs: STATS_DATASET_TTL_MS,
  freshJoinWindowMs: STATS_FRESH_JOIN_WINDOW_MS,
});

export function getStatsItems(options?: TtlCacheReadOptions): Promise<Item[]> {
  return itemsCache.get("items", options);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔁 STATUS HISTORY — every status_change activity, all history        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type StatusHistory = {
  activities: Activity[];
  ids: Set<string>;
  newestTimestamp: number;
  fullLoadAt: number;
};

type StatusActivityDoc = Omit<Activity, "_id"> & { _id: ObjectId | string };

// Merges newly fetched activities into the held history (pure; exported for
// tests). Activities are append-only, so ids already held are skipped.
export function mergeStatusHistory(
  previous: StatusHistory | undefined,
  docs: StatusActivityDoc[],
  fullLoadAt: number
): StatusHistory {
  const activities = previous ? previous.activities.slice() : [];
  const ids = previous ? new Set(previous.ids) : new Set<string>();
  let newestTimestamp = previous?.newestTimestamp ?? Number.NEGATIVE_INFINITY;
  for (const doc of docs) {
    const id = String(doc._id);
    if (ids.has(id)) continue;
    ids.add(id);
    activities.push({ ...doc, _id: id } as Activity);
    if (doc.timestamp > newestTimestamp) newestTimestamp = doc.timestamp;
  }
  return { activities, ids, newestTimestamp, fullLoadAt };
}

async function loadStatusHistory(
  previous: StatusHistory | undefined
): Promise<StatusHistory> {
  const db = await getDb();
  const now = Date.now();
  const incremental =
    previous !== undefined &&
    Number.isFinite(previous.newestTimestamp) &&
    now - previous.fullLoadAt < ACTIVITY_FULL_RELOAD_MS;
  const filter: Document = { type: "status_change" };
  if (incremental) {
    filter.timestamp = {
      $gte: previous.newestTimestamp - ACTIVITY_REFRESH_OVERLAP_MS,
    };
  }
  const docs = (await db
    .collection(`activities-${mode()}`)
    .find(filter, { projection: STATUS_ACTIVITY_PROJECTION })
    .toArray()) as unknown as StatusActivityDoc[];
  return incremental
    ? mergeStatusHistory(previous, docs, previous.fullLoadAt)
    : mergeStatusHistory(undefined, docs, now);
}

const statusHistoryCache = createTtlCache<"status", StatusHistory>(
  (_key, previous) => loadStatusHistory(previous),
  {
    ttlMs: STATS_DATASET_TTL_MS,
    freshJoinWindowMs: STATS_FRESH_JOIN_WINDOW_MS,
  }
);

export async function getStatusActivities(
  options?: TtlCacheReadOptions
): Promise<Activity[]> {
  return (await statusHistoryCache.get("status", options)).activities;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚚 TRACKERS — lean summaries (delivered scan only)                   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

async function loadTrackerSummaries(): Promise<OrderTrackingInfo[]> {
  const db = await getDb();
  return (await db
    .collection(`trackers-${mode()}`)
    .aggregate([trackerSummaryProjectionStage()])
    .toArray()) as unknown as OrderTrackingInfo[];
}

const trackersCache = createTtlCache<"trackers", OrderTrackingInfo[]>(
  () => loadTrackerSummaries(),
  {
    ttlMs: STATS_DATASET_TTL_MS,
    freshJoinWindowMs: STATS_FRESH_JOIN_WINDOW_MS,
  }
);

export function getTrackerSummaries(
  options?: TtlCacheReadOptions
): Promise<OrderTrackingInfo[]> {
  return trackersCache.get("trackers", options);
}
