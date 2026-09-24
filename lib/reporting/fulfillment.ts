import { dayDiffKeys, laDayKey } from "../debt-metrics";
import { parseSquareSize } from "../production-metrics";
import { ItemStatus, type Item } from "../../typings/types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const P90_PERCENTILE = 0.9;
const BACKLOG_STATUSES = new Set<ItemStatus>([
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
]);
const ACTIVE_STATUSES = new Set<ItemStatus>([
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
]);
const CARRIER_ACCEPTED_STATUS = "in_transit";

export type ReportWindow = { start: string; end: string };
export type TrackerSummary = {
  orderId: string;
  trackers?: Array<{
    tracking_details?: Array<{ status?: string; datetime?: string }>;
  }>;
};
export type CompletionEvent = {
  itemId: string;
  completedAt: number;
  createdAt: number;
  dueDateAtCompletion?: string;
  originalDueDate?: string;
};
export type OrderLink = {
  itemId: string;
  platform: "etsy" | "shopify" | "other";
  orderId: string;
};

export function firstCarrierAcceptanceAt(
  trackers: TrackerSummary["trackers"]
): number | null {
  const scans = (trackers ?? [])
    .flatMap((tracker) => tracker.tracking_details ?? [])
    .filter((detail) => detail.status === CARRIER_ACCEPTED_STATUS)
    .map((detail) => Date.parse(detail.datetime ?? ""))
    .filter(Number.isFinite);
  return scans.length ? Math.min(...scans) : null;
}

function median(sorted: number[]): number | null {
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function percentile(sorted: number[], proportion: number): number | null {
  if (!sorted.length) return null;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * proportion) - 1)]!;
}

export function buildFulfillmentWeek(
  items: Item[],
  tracking: TrackerSummary[],
  window: ReportWindow,
  asOf: number = Date.now(),
  completionEvents: CompletionEvent[] = [],
  orderLinks: OrderLink[] = []
) {
  const currentCompletionItems = items.filter((item) =>
    item.visible !== false &&
    !item.deleted &&
    item.status === ItemStatus.Done &&
    typeof item.completedAt === "number" &&
    laDayKey(new Date(item.completedAt)) >= window.start &&
    laDayKey(new Date(item.completedAt)) <= window.end
  );
  const visibleItemIds = new Set(items.map((item) => item.id));
  const byItem = new Map<string, CompletionEvent>();
  for (const event of completionEvents) {
    if (!visibleItemIds.has(event.itemId)) continue;
    const day = laDayKey(new Date(event.completedAt));
    if (day < window.start || day > window.end) continue;
    const existing = byItem.get(event.itemId);
    if (!existing || event.completedAt > existing.completedAt) byItem.set(event.itemId, event);
  }
  for (const item of currentCompletionItems) {
    if (!byItem.has(item.id)) byItem.set(item.id, {
      itemId: item.id,
      completedAt: item.completedAt!,
      createdAt: item.createdAt,
      dueDateAtCompletion: item.dueDateAtCompletion,
      originalDueDate: item.originalDueDate,
    });
  }
  const completions = [...byItem.values()];
  const channelByItem = new Map(orderLinks.map((link) => [link.itemId, link.platform]));
  const completedBySalesChannel = { etsy: 0, shopify: 0, other: 0, unknown: 0 };
  for (const completion of completions) {
    const channel = channelByItem.get(completion.itemId) ?? "unknown";
    completedBySalesChannel[channel]++;
  }
  const completedWithDue = completions.filter((event) => !!event.dueDateAtCompletion);
  const onTimeCompleted = completedWithDue.filter((item) =>
    laDayKey(new Date(item.completedAt)) <= item.dueDateAtCompletion!
  ).length;
  const completedWithOriginalPromise = completions.filter((event) => !!event.originalDueDate);
  const onTimeOriginalPromise = completedWithOriginalPromise.filter((event) =>
    laDayKey(new Date(event.completedAt)) <= event.originalDueDate!
  ).length;
  const promiseExtensions = completions.filter((event) =>
    !!event.originalDueDate && !!event.dueDateAtCompletion &&
    event.dueDateAtCompletion > event.originalDueDate
  ).length;
  const leadTimes = completions
    .map((item) => (item.completedAt - item.createdAt) / MS_PER_DAY)
    .filter((days) => Number.isFinite(days) && days >= 0)
    .sort((a, b) => a - b);

  const acceptanceByOrder = new Map(
    tracking.map((row) => [row.orderId, firstCarrierAcceptanceAt(row.trackers)])
  );
  const carrierAcceptedItems = items.filter((item) => {
    if (item.visible === false || item.deleted) return false;
    const acceptedAt = acceptanceByOrder.get(item.id);
    if (acceptedAt == null) return false;
    const day = laDayKey(new Date(acceptedAt));
    return day >= window.start && day <= window.end;
  }).length;

  const active = items.filter((item) =>
    item.visible !== false && !item.deleted && ACTIVE_STATUSES.has(item.status)
  );
  const today = laDayKey(new Date(asOf));
  const overdueNow = active.filter((item) =>
    !item.onHold && !!item.dueDate && dayDiffKeys(item.dueDate.slice(0, 10), today) > 0
  ).length;
  const backlogByStatus: Partial<Record<ItemStatus, number>> = {};
  let backlogSquares = 0;
  let backlogUnknownSize = 0;
  for (const item of active) {
    if (item.onHold || !BACKLOG_STATUSES.has(item.status)) continue;
    backlogByStatus[item.status] = (backlogByStatus[item.status] ?? 0) + 1;
    const size = parseSquareSize(item.size);
    if (size) backlogSquares += size.squares;
    else backlogUnknownSize++;
  }

  return {
    window,
    asOf: new Date(asOf).toISOString(),
    unit: "order items" as const,
    completedItems: completions.length,
    completedBySalesChannel,
    onTimeCompleted,
    lateCompleted: completedWithDue.length - onTimeCompleted,
    unknownDueAtCompletion: completions.length - completedWithDue.length,
    onTimeOriginalPromise,
    lateOriginalPromise: completedWithOriginalPromise.length - onTimeOriginalPromise,
    unknownOriginalPromise: completions.length - completedWithOriginalPromise.length,
    promiseExtensions,
    carrierAcceptedItems,
    carrierAcceptanceDefinition: "first carrier in_transit scan" as const,
    leadTimeDays: {
      count: leadTimes.length,
      average: leadTimes.length
        ? leadTimes.reduce((sum, days) => sum + days, 0) / leadTimes.length
        : null,
      median: median(leadTimes),
      p90: percentile(leadTimes, P90_PERCENTILE),
    },
    overdueNow,
    backlogByStatus,
    backlogSquares,
    backlogUnknownSize,
  };
}
