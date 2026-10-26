import { Activity, DayName, Item, ItemStatus, WeeklyScheduleData } from "@/typings/types";
import { dayDiffKeys, laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import {
  orderPurchaseFields,
  purchaseHistory,
  type StoredPurchase,
} from "@/lib/shipping-labels/purchase-records";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const MS_PER_DAY = 1000 * 60 * 60 * 24;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📅 DAILY BUCKETS                                                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type DayBucket = { date: string; value: number };

// An item counts as completed only while its status is Done. Reopened orders
// keep their old completedAt, so the timestamp alone is not proof of shipping.
export function completedAtIfDone(
  item: Pick<Item, "completedAt" | "status">
): number | null {
  if (item.status !== ItemStatus.Done) return null;
  return typeof item.completedAt === "number" && Number.isFinite(item.completedAt)
    ? item.completedAt
    : null;
}

// Sparse per-day totals keyed by LA-local YYYY-MM-DD. The stats server ships
// these (one small object for all history) instead of every item; the window
// helpers below turn them back into the same buckets the item-based functions
// produce.
export type DayCounts = Record<string, number>;

// Done items per LA completion day, over all history.
export function countCompletionsByDay(
  items: Pick<Item, "completedAt" | "status">[]
): DayCounts {
  const counts: DayCounts = {};
  for (const item of items) {
    const completedAt = completedAtIfDone(item);
    if (completedAt === null) continue;
    const key = laDayKey(new Date(completedAt));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

// One entry per day in [startKey, endKey], zero-filled, ordered ascending.
export function bucketDayCounts(
  counts: DayCounts,
  startKey: string,
  endKey: string
): DayBucket[] {
  const span = dayDiffKeys(startKey, endKey);
  const out: DayBucket[] = [];
  for (let i = 0; i <= span; i++) {
    const key = shiftDayKey(startKey, i);
    out.push({ date: key, value: counts[key] ?? 0 });
  }
  return out;
}

// Sum of the per-day totals whose key falls in [startKey, endKey].
export function sumDayCounts(
  counts: DayCounts,
  startKey: string,
  endKey: string
): number {
  let total = 0;
  for (const [key, value] of Object.entries(counts)) {
    if (key >= startKey && key <= endKey) total += value;
  }
  return total;
}

// Bucket Done items by their completion day (LA-local). Returns one entry per
// day in [startKey, endKey], including zero-completion days, ordered ascending.
export function bucketCompletionsByDay(
  items: Pick<Item, "completedAt" | "status">[],
  startKey: string,
  endKey: string
): DayBucket[] {
  return bucketDayCounts(countCompletionsByDay(items), startKey, endKey);
}

// Squares (W×H) of Done items per LA completion day; unparseable sizes add 0.
export function countShippedSquaresByDay(
  items: Pick<Item, "completedAt" | "status" | "size">[]
): DayCounts {
  const counts: DayCounts = {};
  for (const item of items) {
    const completedAt = completedAtIfDone(item);
    if (completedAt === null) continue;
    const key = laDayKey(new Date(completedAt));
    counts[key] = (counts[key] ?? 0) + (parseSquareSize(item.size)?.squares ?? 0);
  }
  return counts;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧱 GLUED PER DAY                                                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Statuses an item is in *before* it has been glued.
const PRE_GLUED_STATUSES: ReadonlySet<string> = new Set([
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
]);

// Statuses that mean an item has been glued.
const POST_GLUED_STATUSES: ReadonlySet<string> = new Set([
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
]);

// Parses sizes like "16 x 10", "16x10", "16 X 10", "16 × 10".
// Returns null for custom/named sizes that aren't a simple multiplication.
// `squares` is width * height — treating each unit as one tile.
export function parseSquareSize(
  size: string | undefined | null
): { width: number; height: number; squares: number } | null {
  if (!size) return null;
  const match = size.trim().match(/^(\d+)\s*[x×X]\s*(\d+)$/);
  if (!match) return null;
  const width = parseInt(match[1] ?? "", 10);
  const height = parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (width <= 0 || height <= 0) return null;
  return { width, height, squares: width * height };
}

export type GluedEvent = {
  itemId: string;
  timestamp: number;
  dayKey: string;
  width: number;
  height: number;
  squares: number;
  size: string;
  customerName: string;
  design: string;
};

// Planner week: a planning week runs Saturday → Friday and is keyed by the
// Sunday inside it (DB-compatible with every existing weekKey doc). So week
// key Sun X covers Sat X-1 … Fri X+5, and its Saturday slot is Sat X-1.
export const PLAN_WEEK_DAY_OFFSETS: Record<DayName, number> = {
  Saturday: -1,
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
};
const PLAN_WEEK_FIRST_OFFSET = PLAN_WEEK_DAY_OFFSETS.Saturday;
const DAYS_PER_WEEK = 7;
const SATURDAY_UTC_DAY = 6;

function utcWeekday(dayKey: string): number {
  const [y = Number.NaN, m = Number.NaN, d = Number.NaN] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// Sunday week key of the planner week containing `dayKey` (Saturday rolls
// forward into the next week, matching the production planner).
export function planWeekKeyForDay(dayKey: string): string {
  const dow = utcWeekday(dayKey);
  return dow === SATURDAY_UTC_DAY
    ? shiftDayKey(dayKey, 1)
    : shiftDayKey(dayKey, -dow);
}

// The seven calendar days (Sat → Fri) of the planner week keyed `weekKey`.
export function planWeekDayKeys(weekKey: string): string[] {
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) =>
    shiftDayKey(weekKey, PLAN_WEEK_FIRST_OFFSET + i)
  );
}

// Resolve a (weekKey, day) planner slot to its YYYY-MM-DD date.
export function dayKeyFromWeekSlot(weekKey: string, day: DayName): string {
  return shiftDayKey(weekKey, PLAN_WEEK_DAY_OFFSETS[day]);
}

// Flatten weekly schedule docs into itemId → calendar dayKey. If an item
// somehow appears in multiple slots, the latest calendar day wins (POST_WIP
// items are locked, so this should be rare/never).
export function buildScheduledDayByItemId(
  schedules: Pick<WeeklyScheduleData, "weekKey" | "schedule">[]
): Map<string, string> {
  const out = new Map<string, string>();
  for (const week of schedules) {
    for (const day of Object.keys(week.schedule) as DayName[]) {
      const dayKey = dayKeyFromWeekSlot(week.weekKey, day);
      for (const entry of week.schedule[day] ?? []) {
        const existing = out.get(entry.id);
        if (existing === undefined || existing < dayKey) {
          out.set(entry.id, dayKey);
        }
      }
    }
  }
  return out;
}

// Build per-item glued events. An item only counts if its CURRENT status is
// in {Packaging, At The Door, Done} — items that bounced back to Wip don't
// count, even if they were briefly in a post-glued status. The day used is
// the calendar day the item sits in on the production planner (locked once
// past Wip); we fall back to the most recent forward (PRE → POST) status
// crossing only when the item isn't in any calendar slot. Items whose size
// isn't a simple W×H are dropped (named/custom sizes can't be tallied as
// squares).
export function buildGluedEvents(
  activities: Activity[],
  items: Pick<Item, "id" | "size" | "customerName" | "design" | "status">[],
  scheduledDayByItemId?: Map<string, string>
): GluedEvent[] {
  const transitionsByItem = new Map<string, Activity[]>();
  for (const a of activities) {
    if (a.type !== "status_change") continue;
    const list = transitionsByItem.get(a.itemId) ?? [];
    list.push(a);
    transitionsByItem.set(a.itemId, list);
  }

  const out: GluedEvent[] = [];
  for (const item of items) {
    if (!POST_GLUED_STATUSES.has(item.status)) continue;
    const parsed = parseSquareSize(item.size);
    if (!parsed) continue;

    const transitions = (transitionsByItem.get(item.id) ?? [])
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp);

    let glueTimestamp: number | null = null;
    for (const t of transitions) {
      const change = t.changes.find((c) => c.field === "status");
      if (!change || !change.oldValue) continue;
      if (
        PRE_GLUED_STATUSES.has(change.oldValue) &&
        POST_GLUED_STATUSES.has(change.newValue)
      ) {
        glueTimestamp = t.timestamp;
      }
    }
    if (glueTimestamp === null) continue;

    const scheduledDay = scheduledDayByItemId?.get(item.id);
    const dayKey = scheduledDay ?? laDayKey(new Date(glueTimestamp));

    out.push({
      itemId: item.id,
      timestamp: glueTimestamp,
      dayKey,
      width: parsed.width,
      height: parsed.height,
      squares: parsed.squares,
      size: item.size ?? "",
      customerName: item.customerName ?? "—",
      design: item.design ?? "—",
    });
  }
  out.sort((a, b) => b.timestamp - a.timestamp);
  return out;
}

// Bucket squares glued per day (LA-local). One value per day in
// [startKey, endKey], including zero-days, ordered ascending.
export function bucketGluedSquaresByDay(
  events: GluedEvent[],
  startKey: string,
  endKey: string
): DayBucket[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.dayKey < startKey || e.dayKey > endKey) continue;
    counts.set(e.dayKey, (counts.get(e.dayKey) ?? 0) + e.squares);
  }
  const span = dayDiffKeys(startKey, endKey);
  const out: DayBucket[] = [];
  for (let i = 0; i <= span; i++) {
    const key = shiftDayKey(startKey, i);
    out.push({ date: key, value: counts.get(key) ?? 0 });
  }
  return out;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔮 RECENCY-WEIGHTED FORECAST                                          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Shared config so the planner badge and the glued-stats breakdown agree on
// the same lookback window + weighting.
export const RECENCY_WEIGHTED_FORECAST = {
  lookbackDays: 30,
  recentWindowDays: 15,
  recentWeight: 2,
  olderWeight: 1,
} as const;

// One shared glued-stats window for every forecast consumer (planner capacity,
// planner badge, nav Forecast/Glued badges, overview, glued page): the last
// `lookbackDays` complete LA days plus today. Using the same window lets the
// client dedupe them into one request; today is included only for "glued
// today" and is dropped from the forecast via summarizeGluedForecast.
export function recentGluedWindow(today: string = laDayKey()): {
  start: string;
  end: string;
} {
  return {
    start: shiftDayKey(today, -RECENCY_WEIGHTED_FORECAST.lookbackDays),
    end: today,
  };
}

// Recency-weighted forecast over complete days only — today's partial bucket
// would drag the average down until the shop finishes for the day.
export function summarizeGluedForecast(
  buckets: DayBucket[],
  today: string = laDayKey()
): RecencyWeightedStats {
  const complete = buckets
    .filter((b) => b.date < today)
    .slice(-RECENCY_WEIGHTED_FORECAST.lookbackDays);
  return summarizeRecencyWeighted(complete, RECENCY_WEIGHTED_FORECAST);
}

// Per-active-day average, biased toward the most recent window. The newest
// `recentWindowDays` buckets are weighted `recentWeight`x; the rest weight
// `olderWeight`x. Active = days with value > 0 (matches the planner's
// "working day" rule). Buckets are expected oldest → newest.
export type RecencyWeightedStats = {
  weightedAvgActive: number;
  recentAvgActive: number;
  olderAvgActive: number;
  recentTotal: number;
  olderTotal: number;
  recentActiveDays: number;
  olderActiveDays: number;
  recentWindowDays: number;
  olderWindowDays: number;
  recentWeight: number;
  olderWeight: number;
};

export function summarizeRecencyWeighted(
  buckets: DayBucket[],
  options: {
    recentWindowDays: number;
    recentWeight: number;
    olderWeight: number;
  }
): RecencyWeightedStats {
  const { recentWindowDays, recentWeight, olderWeight } = options;
  const split = Math.max(0, buckets.length - recentWindowDays);
  const older = buckets.slice(0, split);
  const recent = buckets.slice(split);

  const sliceStats = (slice: DayBucket[]) => {
    let total = 0;
    let activeDays = 0;
    for (const b of slice) {
      total += b.value;
      if (b.value > 0) activeDays += 1;
    }
    const avgActive = activeDays > 0 ? total / activeDays : 0;
    return { total, activeDays, avgActive };
  };

  const r = sliceStats(recent);
  const o = sliceStats(older);

  // Combine the two per-active-day averages by weight. Slices with zero
  // active days drop out so we don't pull the result toward 0 on idle weeks.
  let num = 0;
  let den = 0;
  if (r.activeDays > 0) {
    num += r.avgActive * recentWeight;
    den += recentWeight;
  }
  if (o.activeDays > 0) {
    num += o.avgActive * olderWeight;
    den += olderWeight;
  }

  return {
    weightedAvgActive: den > 0 ? num / den : 0,
    recentAvgActive: r.avgActive,
    olderAvgActive: o.avgActive,
    recentTotal: r.total,
    olderTotal: o.total,
    recentActiveDays: r.activeDays,
    olderActiveDays: o.activeDays,
    recentWindowDays: recent.length,
    olderWindowDays: older.length,
    recentWeight,
    olderWeight,
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⏱️ LEAD TIME                                                          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type LeadTimeRow = {
  key: string;
  count: number;
  avgDays: number;
  medianDays: number;
};

export type LeadTimeStats = {
  count: number;
  avgDays: number;
  medianDays: number;
  p90Days: number;
  fastestDays: number;
  slowestDays: number;
  byDesign: LeadTimeRow[];
  bySize: LeadTimeRow[];
};

function leadDays(
  item: Pick<Item, "createdAt" | "completedAt" | "status">
): number | null {
  const completedAt = completedAtIfDone(item);
  if (completedAt === null || !item.createdAt) return null;
  const ms = completedAt - item.createdAt;
  if (ms < 0) return null;
  return ms / MS_PER_DAY;
}

function summarize(values: number[]): {
  avgDays: number;
  medianDays: number;
  p90Days: number;
  fastestDays: number;
  slowestDays: number;
} {
  if (values.length === 0) {
    return {
      avgDays: 0,
      medianDays: 0,
      p90Days: 0,
      fastestDays: 0,
      slowestDays: 0,
    };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : sorted[mid] ?? 0;
  const p90Index = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9));
  return {
    avgDays: sum / sorted.length,
    medianDays: median,
    p90Days: sorted[p90Index] ?? 0,
    fastestDays: sorted[0] ?? 0,
    slowestDays: sorted[sorted.length - 1] ?? 0,
  };
}

export function computeLeadTimeStats(
  items: Pick<Item, "createdAt" | "completedAt" | "design" | "size" | "status">[]
): LeadTimeStats {
  const all: number[] = [];
  const byDesign = new Map<string, number[]>();
  const bySize = new Map<string, number[]>();

  for (const item of items) {
    const days = leadDays(item);
    if (days === null) continue;
    all.push(days);
    if (item.design) {
      const list = byDesign.get(item.design) ?? [];
      list.push(days);
      byDesign.set(item.design, list);
    }
    if (item.size) {
      const list = bySize.get(item.size) ?? [];
      list.push(days);
      bySize.set(item.size, list);
    }
  }

  const overall = summarize(all);
  const toRows = (map: Map<string, number[]>): LeadTimeRow[] =>
    Array.from(map.entries())
      .map(([key, values]) => {
        const s = summarize(values);
        return {
          key,
          count: values.length,
          avgDays: s.avgDays,
          medianDays: s.medianDays,
        };
      })
      .sort((a, b) => b.avgDays - a.avgDays);

  return {
    count: all.length,
    ...overall,
    byDesign: toRows(byDesign),
    bySize: toRows(bySize),
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ✅ ON-TIME                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type OnTimeStats = {
  total: number;
  onTime: number;
  late: number;
  // null when nothing with a due date shipped in the window — callers show
  // "—" instead of a misleading red 0%.
  onTimePct: number | null;
  avgDaysLate: number;
};

// Per LA completion day: dated Done items, how many shipped on time, how many
// late and their summed days late. Summing days reproduces computeOnTimeStats
// for any window.
export type OnTimeDay = {
  total: number;
  onTime: number;
  late: number;
  lateDays: number;
};
export type OnTimeDays = Record<string, OnTimeDay>;

export function countOnTimeByDay(
  items: Pick<Item, "completedAt" | "dueDate" | "status">[]
): OnTimeDays {
  const days: OnTimeDays = {};
  for (const item of items) {
    const completedAt = completedAtIfDone(item);
    if (completedAt === null) continue;
    const due = item.dueDate?.slice(0, 10);
    if (!due || due.length !== 10) continue;
    const completedKey = laDayKey(new Date(completedAt));
    const day = (days[completedKey] ??= { total: 0, onTime: 0, late: 0, lateDays: 0 });
    day.total += 1;
    const diff = dayDiffKeys(due, completedKey);
    if (diff <= 0) {
      day.onTime += 1;
    } else {
      day.late += 1;
      day.lateDays += diff;
    }
  }
  return days;
}

export function onTimeStatsFromDays(
  days: OnTimeDays,
  startKey: string,
  endKey: string
): OnTimeStats {
  let total = 0;
  let onTime = 0;
  let lateDaysSum = 0;
  let lateCount = 0;
  for (const [key, day] of Object.entries(days)) {
    if (key < startKey || key > endKey) continue;
    total += day.total;
    onTime += day.onTime;
    lateCount += day.late;
    lateDaysSum += day.lateDays;
  }
  return {
    total,
    onTime,
    late: lateCount,
    onTimePct: total === 0 ? null : (onTime / total) * 100,
    avgDaysLate: lateCount === 0 ? 0 : lateDaysSum / lateCount,
  };
}

// On-time = a Done item's completedAt LA day key <= item.dueDate.
export function computeOnTimeStats(
  items: Pick<Item, "completedAt" | "dueDate" | "status">[],
  startKey: string,
  endKey: string
): OnTimeStats {
  return onTimeStatsFromDays(countOnTimeByDay(items), startKey, endKey);
}

// Weekly on-time % series. Each bucket is a 7-day window ending on the given
// day. Skips weeks with zero completions (returns null for value).
export type OnTimeWeekBucket = {
  date: string;
  value: number | null;
  total: number;
};

export function bucketOnTimeDaysByWeek(
  days: OnTimeDays,
  startKey: string,
  endKey: string
): OnTimeWeekBucket[] {
  const span = dayDiffKeys(startKey, endKey);
  const buckets: OnTimeWeekBucket[] = [];
  for (let i = 6; i <= span; i += 7) {
    const weekEnd = shiftDayKey(startKey, i);
    const weekStart = shiftDayKey(weekEnd, -6);
    const stats = onTimeStatsFromDays(days, weekStart, weekEnd);
    buckets.push({
      date: weekEnd,
      total: stats.total,
      value: stats.total === 0 ? null : stats.onTimePct,
    });
  }
  return buckets;
}

export function bucketOnTimeByWeek(
  items: Pick<Item, "completedAt" | "dueDate" | "status">[],
  startKey: string,
  endKey: string
): OnTimeWeekBucket[] {
  return bucketOnTimeDaysByWeek(countOnTimeByDay(items), startKey, endKey);
}

// Items currently past their due date and not yet completed. Status decides
// completion: reopened orders keep a stale completedAt but are late again.
export function computeCurrentlyLate(
  items: Item[]
): { item: Item; daysLate: number }[] {
  const today = laDayKey();
  const rows: { item: Item; daysLate: number }[] = [];
  for (const item of items) {
    if (item.status === ItemStatus.Done) continue;
    const due = item.dueDate?.slice(0, 10);
    if (!due || due.length !== 10) continue;
    const diff = dayDiffKeys(due, today);
    if (diff > 0) rows.push({ item, daysLate: diff });
  }
  rows.sort((a, b) => b.daysLate - a.daysLate);
  return rows;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎨 MIX                                                                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type MixRow = { key: string; count: number; pct: number };

export function computeMix(
  items: Pick<Item, "design" | "size" | "createdAt">[],
  startKey: string,
  endKey: string
): { total: number; designs: MixRow[]; sizes: MixRow[] } {
  const designs = new Map<string, number>();
  const sizes = new Map<string, number>();
  let total = 0;
  for (const item of items) {
    const key = laDayKey(new Date(item.createdAt));
    if (key < startKey || key > endKey) continue;
    total += 1;
    if (item.design) designs.set(item.design, (designs.get(item.design) ?? 0) + 1);
    if (item.size) sizes.set(item.size, (sizes.get(item.size) ?? 0) + 1);
  }
  const toRows = (map: Map<string, number>): MixRow[] =>
    Array.from(map.entries())
      .map(([key, count]) => ({
        key,
        count,
        pct: total === 0 ? 0 : (count / total) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  return { total, designs: toRows(designs), sizes: toRows(sizes) };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📊 SERIES SUMMARY (numeric daily series)                             ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const RECENT_VELOCITY_DAYS = 7;

export type DaySeriesStats = {
  total: number;
  peak: number;
  average: number;
  median: number;
  recentAverage: number;
  priorAverage: number;
  longestStreak: number;
  daysWithValue: number;
};

export function summarizeDayBuckets(buckets: DayBucket[]): DaySeriesStats {
  if (buckets.length === 0) {
    return {
      total: 0,
      peak: 0,
      average: 0,
      median: 0,
      recentAverage: 0,
      priorAverage: 0,
      longestStreak: 0,
      daysWithValue: 0,
    };
  }
  const values = buckets.map((b) => b.value);
  const total = values.reduce((s, v) => s + v, 0);
  const peak = Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : sorted[mid] ?? 0;

  let longestStreak = 0;
  let currentStreak = 0;
  let daysWithValue = 0;
  for (const v of values) {
    if (v > 0) {
      daysWithValue += 1;
      currentStreak += 1;
      if (currentStreak > longestStreak) longestStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  }

  const recentSlice = values.slice(-RECENT_VELOCITY_DAYS);
  const priorSlice = values.slice(
    -RECENT_VELOCITY_DAYS * 2,
    -RECENT_VELOCITY_DAYS
  );
  const recentAverage = recentSlice.length
    ? recentSlice.reduce((s, v) => s + v, 0) / recentSlice.length
    : 0;
  const priorAverage = priorSlice.length
    ? priorSlice.reduce((s, v) => s + v, 0) / priorSlice.length
    : recentAverage;

  return {
    total,
    peak,
    average: total / values.length,
    median,
    recentAverage,
    priorAverage,
    longestStreak,
    daysWithValue,
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪖 STATUS DURATIONS (from activity log)                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const MS_PER_DAY_2 = 1000 * 60 * 60 * 24;

export type StatusDurationRow = {
  status: ItemStatus;
  totalDays: number;
  count: number;
  avgDays: number;
  medianDays: number;
};

// Reconstruct (status, durationDays) segments per item from activity log.
// Each status_change activity tells us the item left oldValue at that
// timestamp. We pair consecutive transitions and treat the first transition
// as the end of an "initial" segment (status before first transition).
//
// Items with incomplete history are skipped rather than guessed: no
// status_change at all (a Done item would otherwise log completedAt −
// createdAt as time "in Done"), or created before `historyStartMs` — the
// oldest activity the caller loaded when its fetch was capped, so earlier
// transitions may be missing.
export function computeStatusDurations(
  items: Item[],
  activities: Activity[],
  historyStartMs: number | null = null
): StatusDurationRow[] {
  const byItem = new Map<string, Activity[]>();
  for (const a of activities) {
    if (a.type !== "status_change") continue;
    const list = byItem.get(a.itemId) ?? [];
    list.push(a);
    byItem.set(a.itemId, list);
  }

  type Bucket = { values: number[]; total: number };
  const buckets = new Map<ItemStatus, Bucket>();
  const add = (status: ItemStatus, days: number) => {
    if (days <= 0) return;
    const b = buckets.get(status) ?? { values: [], total: 0 };
    b.values.push(days);
    b.total += days;
    buckets.set(status, b);
  };

  for (const item of items) {
    if (historyStartMs !== null && item.createdAt < historyStartMs) continue;
    const transitions = (byItem.get(item.id) ?? [])
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp);
    if (transitions.length === 0) continue;

    let prevStatus: ItemStatus | null = null;
    let prevTime = item.createdAt;
    for (const t of transitions) {
      const change = t.changes.find((c) => c.field === "status");
      if (!change) continue;
      const oldStatus = (change.oldValue as ItemStatus) ?? prevStatus;
      const days = (t.timestamp - prevTime) / MS_PER_DAY_2;
      if (oldStatus) add(oldStatus, days);
      prevStatus = change.newValue as ItemStatus;
      prevTime = t.timestamp;
    }
    // Final open-ended segment: time in the current status so far. Done is
    // terminal, so it never accrues a bottleneck segment.
    const finalStatus = prevStatus ?? item.status;
    if (finalStatus !== ItemStatus.Done && item.status !== ItemStatus.Done) {
      add(finalStatus, (Date.now() - prevTime) / MS_PER_DAY_2);
    }
  }

  const rows: StatusDurationRow[] = [];
  for (const [status, b] of buckets.entries()) {
    const sorted = [...b.values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 === 0
        ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
        : sorted[mid] ?? 0;
    rows.push({
      status,
      totalDays: b.total,
      count: b.values.length,
      avgDays: b.values.length ? b.total / b.values.length : 0,
      medianDays: median,
    });
  }
  return rows.sort((a, b) => b.avgDays - a.avgDays);
}

// For each currently-active item, days since it last entered its current
// status (via the most recent status_change activity to that status). Falls
// back to days since createdAt if no transitions exist.
export function computeWipAging(
  items: Item[],
  activities: Activity[]
): { item: Item; daysInStatus: number }[] {
  const byItem = new Map<string, Activity[]>();
  for (const a of activities) {
    if (a.type !== "status_change") continue;
    const list = byItem.get(a.itemId) ?? [];
    list.push(a);
    byItem.set(a.itemId, list);
  }
  const now = Date.now();
  const rows: { item: Item; daysInStatus: number }[] = [];
  for (const item of items) {
    if (item.status === ItemStatus.Done || item.status === ItemStatus.Hidden)
      continue;
    const transitions = (byItem.get(item.id) ?? []).slice();
    transitions.sort((a, b) => b.timestamp - a.timestamp);
    let lastEntered = item.createdAt;
    for (const t of transitions) {
      const change = t.changes.find((c) => c.field === "status");
      if (!change) continue;
      if (change.newValue === item.status) {
        lastEntered = t.timestamp;
        break;
      }
    }
    rows.push({
      item,
      daysInStatus: (now - lastEntered) / MS_PER_DAY_2,
    });
  }
  return rows.sort((a, b) => b.daysInStatus - a.daysInStatus);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📅 DAY-OF-WEEK BUCKETS                                               ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export const DAY_OF_WEEK_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
] as const;

export type DayOfWeekRow = { day: string; total: number; activeDays: number; avg: number };

export function bucketByDayOfWeek(
  items: Pick<Item, "completedAt" | "status">[],
  startKey: string,
  endKey: string
): DayOfWeekRow[] {
  return bucketDayCountsByDayOfWeek(
    countCompletionsByDay(items),
    startKey,
    endKey
  );
}

// Per day-of-week totals of per-day counts across [startKey, endKey].
export function bucketDayCountsByDayOfWeek(
  perDay: DayCounts,
  startKey: string,
  endKey: string
): DayOfWeekRow[] {
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];
  const span = dayDiffKeys(startKey, endKey);
  for (let i = 0; i <= span; i++) {
    const key = shiftDayKey(startKey, i);
    const [y, m, d] = key.split("-").map(Number);
    if (y === undefined || m === undefined || d === undefined) continue;
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    const v = perDay[key] ?? 0;
    totals[dow]! += v;
    dayCounts[dow]! += 1;
  }
  return DAY_OF_WEEK_LABELS.map((day, dow) => ({
    day,
    total: totals[dow]!,
    activeDays: dayCounts[dow]!,
    avg: dayCounts[dow]! ? totals[dow]! / dayCounts[dow]! : 0,
  }));
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚚 SHIPPING METRICS                                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type ShippingSpendRow = { date: string; cost: number; count: number };

// Label sources whose cost was not paid through this app (e.g. a label PDF
// uploaded from elsewhere). They have no real charge, so they'd drag the
// per-shipment average toward $0.
const UNPRICED_SHIPMENT_SOURCES: ReadonlySet<string> = new Set(["uploaded"]);

// Charge for a purchased shipment, or null when it has no real cost (missing
// / zero / non-numeric charge, or an uploaded label). Null shipments are left
// out of spend totals and per-shipment averages.
export function shipmentCost(
  ship: Item["purchasedShipment"] | StoredPurchase | null | undefined
): number | null {
  if (!ship) return null;
  const source = (ship as { source?: unknown }).source;
  if (typeof source === "string" && UNPRICED_SHIPMENT_SOURCES.has(source)) {
    return null;
  }
  if ((ship as StoredPurchase).voidedAt) return null;
  const cost = parseFloat(String(ship.totalNetCharge ?? ""));
  return Number.isFinite(cost) && cost > 0 ? cost : null;
}

export function bucketShippingSpendByDay(
  items: Item[],
  startKey: string,
  endKey: string
): ShippingSpendRow[] {
  const byDay = new Map<string, { cost: number; count: number }>();
  for (const item of items) {
    // Every recorded purchase counts (a repurchase is a second real charge);
    // voided and uploaded ones are dropped by shipmentCost.
    for (const ship of purchaseHistory(orderPurchaseFields(item))) {
      if (!ship.purchasedAt) continue;
      const key = laDayKey(new Date(ship.purchasedAt));
      if (key < startKey || key > endKey) continue;
      const cost = shipmentCost(ship);
      if (cost === null) continue;
      const cur = byDay.get(key) ?? { cost: 0, count: 0 };
      cur.cost += cost;
      cur.count += 1;
      byDay.set(key, cur);
    }
  }
  const out: ShippingSpendRow[] = [];
  const span = dayDiffKeys(startKey, endKey);
  for (let i = 0; i <= span; i++) {
    const key = shiftDayKey(startKey, i);
    const v = byDay.get(key) ?? { cost: 0, count: 0 };
    out.push({ date: key, cost: v.cost, count: v.count });
  }
  return out;
}

export function summarizeShippingSpend(rows: ShippingSpendRow[]): {
  total: number;
  count: number;
  avgPerShipment: number;
  peakDayCost: number;
} {
  let total = 0;
  let count = 0;
  let peakDayCost = 0;
  for (const r of rows) {
    total += r.cost;
    count += r.count;
    if (r.cost > peakDayCost) peakDayCost = r.cost;
  }
  return {
    total,
    count,
    avgPerShipment: count ? total / count : 0,
    peakDayCost,
  };
}

export type DeliverySpeedRow = {
  itemId: string;
  customerName: string;
  serviceType?: string;
  purchasedAt: number;
  deliveredAt: number;
  transitDays: number;
};

// Map of orderId -> delivered-at timestamp (ms), built from tracker data.
export type DeliveryByOrder = Map<string, number>;

export function buildDeliveryByOrder(
  trackingInfos: { orderId: string; trackers?: { tracking_details?: { status?: string; datetime?: string }[] }[] }[]
): DeliveryByOrder {
  const out: DeliveryByOrder = new Map();
  for (const info of trackingInfos) {
    let earliest: number | null = null;
    for (const tracker of info.trackers ?? []) {
      const delivered = tracker.tracking_details?.find(
        (t) => t.status === "delivered"
      );
      if (delivered?.datetime) {
        const ts = new Date(delivered.datetime).getTime();
        if (!Number.isNaN(ts) && (earliest === null || ts < earliest)) {
          earliest = ts;
        }
      }
    }
    if (earliest !== null) out.set(info.orderId, earliest);
  }
  return out;
}

export function computeDeliverySpeeds(
  items: Item[],
  deliveryByOrder: DeliveryByOrder
): DeliverySpeedRow[] {
  const rows: DeliverySpeedRow[] = [];
  for (const item of items) {
    const ship = item.purchasedShipment;
    if (!ship?.purchasedAt) continue;
    // Trackers are stored under the item's id; most saved shipments carry no
    // (or a stale) orderId of their own.
    const deliveredAt =
      deliveryByOrder.get(item.id) ??
      (ship.orderId ? deliveryByOrder.get(ship.orderId) : undefined);
    if (!deliveredAt) continue;
    const transitDays = (deliveredAt - ship.purchasedAt) / MS_PER_DAY_2;
    if (transitDays < 0) continue;
    rows.push({
      itemId: item.id,
      customerName: item.customerName ?? "—",
      serviceType: ship.serviceType,
      purchasedAt: ship.purchasedAt,
      deliveredAt,
      transitDays,
    });
  }
  return rows.sort((a, b) => b.purchasedAt - a.purchasedAt);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🗺️ STATE MIX                                                          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export function computeStateMix(items: Item[]): { state: string; count: number; pct: number }[] {
  const counts = new Map<string, number>();
  let total = 0;
  for (const item of items) {
    const state = item.shippingDetails?.state;
    if (!state) continue;
    counts.set(state, (counts.get(state) ?? 0) + 1);
    total += 1;
  }
  return Array.from(counts.entries())
    .map(([state, count]) => ({
      state,
      count,
      pct: total ? (count / total) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📈 TRENDING — design popularity delta between two windows            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ❤️ HEALTH SCORE                                                       ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const HEALTH_WEIGHT_ON_TIME = 30;
const HEALTH_WEIGHT_DEBT = 20;
const HEALTH_WEIGHT_LATE_NOW = 15;
const HEALTH_WEIGHT_VELOCITY = 15;
const HEALTH_WEIGHT_FORECAST = 20;
const HEALTH_VELOCITY_PENALTY_MULTIPLIER = 2;
const HEALTH_ON_TIME_TARGET = 95;
const HEALTH_DEBT_HEAVY_DAYS = 30;
const HEALTH_LATE_HEAVY_COUNT = 10;
const HEALTH_FORECAST_DRIFT_HEAVY_DAYS = 30;
const HEALTH_FORECAST_FALLBACK_LEAD = 14;
const HEALTH_FORECAST_MAX_DAYS_OUT = 365 * 5;
// On-time rate: recent shipments weigh more than older ones in the
// 30-day window. Older than N days, each on-time/late event counts
// for half.
const HEALTH_ON_TIME_RECENT_DAYS = 14;
const HEALTH_ON_TIME_OLD_WEIGHT = 0.5;
const HEALTH_RANGE_DAYS = 30;

// Consecutive on-time shipments (each counting full weight, as a new recent
// shipment would) needed to lift a weighted on-time rate to `targetPct`:
// smallest n with (onTime + n) / (total + n) >= target. 0 when already there;
// null when the target is unreachable (>= 100%).
export function onTimeShipmentsToTarget(
  weightedOnTime: number,
  weightedTotal: number,
  targetPct: number
): number | null {
  const target = targetPct / 100;
  if (target >= 1) return null;
  const needed = (target * weightedTotal - weightedOnTime) / (1 - target);
  return needed <= 0 ? 0 : Math.ceil(needed - 1e-9);
}

export type HealthBreakdownRow = {
  label: string;
  earned: number;
  weight: number;
  // Compact summary like "92% (target 95%)" — kept for backwards compat.
  raw: string;
  // Structured fields for richer rendering:
  actual: string;
  target: string;
  hint: string;
};

export function computeHealthScore(
  items: Item[],
  options: {
    simulateDebtCleared?: boolean;
    // If set, additionally simulate debt having been zero for the past N
    // days. Implies simulateDebtCleared. In that window, any late shipment
    // is reclassified as on-time (you can't have completed late without
    // being briefly overdue).
    sustainedDebtFreeDays?: number;
  } = {}
): {
  total: number;
  breakdown: HealthBreakdownRow[];
} {
  const today = laDayKey();
  const start = shiftDayKey(today, -(HEALTH_RANGE_DAYS - 1));
  const sustainedDays = options.sustainedDebtFreeDays ?? 0;
  const debtClearedNow = options.simulateDebtCleared || sustainedDays > 0;
  const sustainedCutoff =
    sustainedDays > 0 ? shiftDayKey(today, -(sustainedDays - 1)) : null;
  // Paused items do not participate in debt, currently-late, or forecast
  // health. Historical completion metrics remain unchanged.
  const activeAll = items.filter(
    (i) =>
      i.status !== ItemStatus.Done &&
      i.status !== ItemStatus.Hidden &&
      !i.onHold
  );
  // Counterfactual: pretend all currently-overdue items are gone. They drop
  // out of the debt, late-now, and forecast computations — but historical
  // on-time rate and velocity (which look at completedAt) are untouched.
  const active = debtClearedNow
    ? activeAll.filter((i) => {
        const due = i.dueDate?.slice(0, 10);
        if (!due || due.length !== 10) return true;
        return dayDiffKeys(due, today) <= 0;
      })
    : activeAll;
  let debt = 0;
  for (const item of active) {
    const due = item.dueDate?.slice(0, 10);
    if (!due || due.length !== 10) continue;
    const diff = dayDiffKeys(due, today);
    if (diff > 0) debt += diff;
  }
  const lateNow = computeCurrentlyLate(active).length;
  // Velocity compares complete days only (ending yesterday, like the
  // delivery briefing) so today's partial count never reads as a slowdown.
  const yesterday = shiftDayKey(today, -1);
  const buckets = bucketCompletionsByDay(
    items,
    shiftDayKey(yesterday, -(RECENT_VELOCITY_DAYS * 2 - 1)),
    yesterday
  );
  const onTime = computeOnTimeStats(items, start, today);

  // Recency-weighted on-time pct: shipments older than N days count
  // for less, so a recent miss matters more than an old one.
  const onTimeRecentCutoff = shiftDayKey(today, -HEALTH_ON_TIME_RECENT_DAYS);
  let weightedOnTime = 0;
  let weightedTotal = 0;
  for (const item of items) {
    const completedAt = completedAtIfDone(item);
    if (completedAt === null) continue;
    const due = item.dueDate?.slice(0, 10);
    if (!due || due.length !== 10) continue;
    const completedKey = laDayKey(new Date(completedAt));
    if (completedKey < start || completedKey > today) continue;
    const weight =
      completedKey >= onTimeRecentCutoff ? 1 : HEALTH_ON_TIME_OLD_WEIGHT;
    weightedTotal += weight;
    const diff = dayDiffKeys(due, completedKey);
    const inSustainedWindow =
      sustainedCutoff !== null && completedKey >= sustainedCutoff;
    if (diff <= 0 || inSustainedWindow) weightedOnTime += weight;
  }
  const weightedOnTimePct =
    weightedTotal === 0 ? 0 : (weightedOnTime / weightedTotal) * 100;
  const shipmentsToTarget = onTimeShipmentsToTarget(
    weightedOnTime,
    weightedTotal,
    HEALTH_ON_TIME_TARGET
  );

  const leadStats = computeLeadTimeStats(items);
  const designAvg = new Map(leadStats.byDesign.map((r) => [r.key, r.avgDays]));
  const sizeAvg = new Map(leadStats.bySize.map((r) => [r.key, r.avgDays]));
  const overallLead = leadStats.avgDays || HEALTH_FORECAST_FALLBACK_LEAD;
  const nowMs = Date.now();
  let forecastDrift = 0;
  let forecastLateItems = 0;
  let forecastDueItems = 0;
  for (const item of active) {
    const due = item.dueDate?.slice(0, 10);
    if (!due || due.length !== 10) continue;
    forecastDueItems += 1;
    const designLead = item.design ? designAvg.get(item.design) : undefined;
    const sizeLead = item.size ? sizeAvg.get(item.size) : undefined;
    const candidate =
      (Number.isFinite(designLead) ? designLead : undefined) ??
      (Number.isFinite(sizeLead) ? sizeLead : undefined) ??
      overallLead;
    const baseAvg = Number.isFinite(candidate)
      ? (candidate as number)
      : HEALTH_FORECAST_FALLBACK_LEAD;
    const ageDaysRaw =
      typeof item.createdAt === "number"
        ? (nowMs - item.createdAt) / MS_PER_DAY
        : 0;
    const ageDays = Number.isFinite(ageDaysRaw) ? ageDaysRaw : 0;
    const remaining = Math.max(1, baseAvg - ageDays);
    const remainingDays = Number.isFinite(remaining)
      ? Math.min(Math.ceil(remaining), HEALTH_FORECAST_MAX_DAYS_OUT)
      : HEALTH_FORECAST_FALLBACK_LEAD;
    const projectedKey = shiftDayKey(today, remainingDays);
    const slip = dayDiffKeys(due, projectedKey);
    if (slip > 0) {
      forecastDrift += slip;
      forecastLateItems += 1;
    }
  }

  const onTimeScore =
    weightedTotal === 0
      ? HEALTH_WEIGHT_ON_TIME
      : (Math.min(weightedOnTimePct, HEALTH_ON_TIME_TARGET) /
          HEALTH_ON_TIME_TARGET) *
        HEALTH_WEIGHT_ON_TIME;
  const debtScore =
    debt <= 0
      ? HEALTH_WEIGHT_DEBT
      : Math.max(0, 1 - debt / HEALTH_DEBT_HEAVY_DAYS) * HEALTH_WEIGHT_DEBT;
  const lateScore =
    lateNow <= 0
      ? HEALTH_WEIGHT_LATE_NOW
      : Math.max(0, 1 - lateNow / HEALTH_LATE_HEAVY_COUNT) *
        HEALTH_WEIGHT_LATE_NOW;
  // Velocity here uses per-working-day pace (days with > 0 completions),
  // mirroring the glued/week chart. A weekday off should not look like a
  // velocity drop.
  const recentValues = buckets
    .slice(-RECENT_VELOCITY_DAYS)
    .map((b) => b.value);
  const priorValues = buckets
    .slice(-RECENT_VELOCITY_DAYS * 2, -RECENT_VELOCITY_DAYS)
    .map((b) => b.value);
  const recentWorking = recentValues.filter((v) => v > 0);
  const priorWorking = priorValues.filter((v) => v > 0);
  const recentPerWorkingDay =
    recentWorking.length > 0
      ? recentWorking.reduce((s, v) => s + v, 0) / recentWorking.length
      : 0;
  const priorPerWorkingDay =
    priorWorking.length > 0
      ? priorWorking.reduce((s, v) => s + v, 0) / priorWorking.length
      : 0;
  const velocityDelta = recentPerWorkingDay - priorPerWorkingDay;
  const velocityScore =
    recentWorking.length === 0 ||
    priorWorking.length === 0 ||
    velocityDelta >= 0
      ? HEALTH_WEIGHT_VELOCITY
      : Math.max(
          0,
          1 +
            (velocityDelta / Math.max(priorPerWorkingDay, 1)) *
              HEALTH_VELOCITY_PENALTY_MULTIPLIER
        ) * HEALTH_WEIGHT_VELOCITY;
  const forecastScore =
    forecastDrift <= 0
      ? HEALTH_WEIGHT_FORECAST
      : Math.max(0, 1 - forecastDrift / HEALTH_FORECAST_DRIFT_HEAVY_DAYS) *
        HEALTH_WEIGHT_FORECAST;

  const total = Math.round(
    onTimeScore + debtScore + lateScore + velocityScore + forecastScore
  );
  return {
    total,
    breakdown: [
      {
        label: "On-time rate",
        earned: onTimeScore,
        weight: HEALTH_WEIGHT_ON_TIME,
        raw: `${Math.round(weightedOnTimePct)}% weighted (target ${HEALTH_ON_TIME_TARGET}%)`,
        actual:
          weightedTotal === 0
            ? "no shipments"
            : `${Math.round(weightedOnTimePct)}% recency-weighted (${onTime.onTimePct === null ? "—" : `${Math.round(onTime.onTimePct)}%`} raw)`,
        target: `${HEALTH_ON_TIME_TARGET}% target`,
        hint:
          weightedTotal === 0
            ? "Nothing shipped yet — full credit by default."
            : weightedOnTimePct >= HEALTH_ON_TIME_TARGET
              ? "Hitting your target. Nice."
              : `Recent shipments count fully; older than ${HEALTH_ON_TIME_RECENT_DAYS} days count ${Math.round(HEALTH_ON_TIME_OLD_WEIGHT * 100)}%.${shipmentsToTarget === null ? "" : ` Ship the next ${shipmentsToTarget} on time in a row to reach target.`}`,
      },
      {
        label: "Time Debt",
        earned: debtScore,
        weight: HEALTH_WEIGHT_DEBT,
        raw: `${debt} overdue days`,
        actual: `${debt} overdue day${debt === 1 ? "" : "s"}`,
        target: "0 overdue days",
        hint:
          debt === 0
            ? "No overdue items. Clean slate."
            : `Each day cleared adds ${(HEALTH_WEIGHT_DEBT / HEALTH_DEBT_HEAVY_DAYS).toFixed(2)} pts. Hits 0 at ${HEALTH_DEBT_HEAVY_DAYS}+ days.`,
      },
      {
        label: "Late items",
        earned: lateScore,
        weight: HEALTH_WEIGHT_LATE_NOW,
        raw: `${lateNow} late now`,
        actual: `${lateNow} item${lateNow === 1 ? "" : "s"} past due`,
        target: "0 late items",
        hint:
          lateNow === 0
            ? "Nothing's late. Keep it that way."
            : `Each cleared late item adds ${(HEALTH_WEIGHT_LATE_NOW / HEALTH_LATE_HEAVY_COUNT).toFixed(1)} pts. Hits 0 at ${HEALTH_LATE_HEAVY_COUNT}+ items.`,
      },
      {
        label: "Velocity",
        earned: velocityScore,
        weight: HEALTH_WEIGHT_VELOCITY,
        raw: `${velocityDelta > 0 ? "+" : ""}${velocityDelta.toFixed(1)} / working day vs prior`,
        actual:
          recentWorking.length === 0
            ? "no working days last 7"
            : `${recentPerWorkingDay.toFixed(1)} / working day (${recentWorking.length} of last 7)`,
        target:
          priorWorking.length === 0
            ? "no prior working days"
            : `≥ ${priorPerWorkingDay.toFixed(1)} / working day (${priorWorking.length} of prior 7)`,
        hint:
          recentWorking.length === 0 || priorWorking.length === 0
            ? "Not enough working days to compare — full credit by default."
            : velocityDelta >= 0
              ? "Per-working-day pace holding or improving. Days off don't count."
              : `Down ${Math.abs(velocityDelta).toFixed(1)} / working day vs the prior week.`,
      },
      {
        label: "Forecast drift",
        earned: forecastScore,
        weight: HEALTH_WEIGHT_FORECAST,
        raw: `${forecastDrift} projected late-days`,
        actual:
          forecastDueItems === 0
            ? "no items with due dates"
            : forecastDrift === 0
              ? `${forecastDueItems} on track`
              : `${forecastLateItems}/${forecastDueItems} projected late · ${forecastDrift} day${forecastDrift === 1 ? "" : "s"} of slip`,
        target: "0 projected late-days",
        hint:
          forecastDueItems === 0
            ? "No active items with due dates — full credit by default."
            : forecastDrift === 0
              ? "Every active item projects to ship on or before its due date."
              : `Each projected late-day cleared adds ${(HEALTH_WEIGHT_FORECAST / HEALTH_FORECAST_DRIFT_HEAVY_DAYS).toFixed(2)} pts. Hits 0 at ${HEALTH_FORECAST_DRIFT_HEAVY_DAYS}+ days. Projection = avg lead time for design/size − age so far.`,
      },
    ],
  };
}

export function computeDesignTrend(
  items: Pick<Item, "design" | "createdAt">[],
  recentStartKey: string,
  recentEndKey: string,
  priorStartKey: string,
  priorEndKey: string
): { design: string; recent: number; prior: number; delta: number; deltaPct: number }[] {
  const recent = new Map<string, number>();
  const prior = new Map<string, number>();
  for (const item of items) {
    if (!item.design) continue;
    const key = laDayKey(new Date(item.createdAt));
    if (key >= recentStartKey && key <= recentEndKey) {
      recent.set(item.design, (recent.get(item.design) ?? 0) + 1);
    } else if (key >= priorStartKey && key <= priorEndKey) {
      prior.set(item.design, (prior.get(item.design) ?? 0) + 1);
    }
  }
  const all = new Set<string>([...recent.keys(), ...prior.keys()]);
  const rows = Array.from(all).map((design) => {
    const r = recent.get(design) ?? 0;
    const p = prior.get(design) ?? 0;
    const delta = r - p;
    const deltaPct = p === 0 ? (r === 0 ? 0 : 100) : ((r - p) / p) * 100;
    return { design, recent: r, prior: p, delta, deltaPct };
  });
  return rows.sort((a, b) => b.delta - a.delta);
}
