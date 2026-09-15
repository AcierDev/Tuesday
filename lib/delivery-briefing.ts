import { ItemStatus, type Item } from "@/typings/types";
import { dayDiffKeys, laDayKey, shiftDayKey } from "@/lib/debt-metrics";

export const DELIVERY_BRIEFING_CONFIG = {
  timeZone: "America/Los_Angeles",
  historyDays: 30,
  upcomingDays: 7,
  criticalOverduePercent: 25,
  criticalOldestDays: 14,
  criticalOnTimePercent: 70,
  targetOnTimePercent: 90,
  minimumShippingSample: 5,
  percentScale: 100,
  pollIntervalMs: 60_000,
  requestTimeoutMs: 45_000,
  maxSummaryCharacters: 1_600,
  midnightHour: 0,
} as const;

export type DeliveryItem = Pick<Item,
  "status" | "dueDate" | "completedAt" | "visible" | "deleted" | "onHold"
>;

export type DeliveryMetrics = {
  active: number;
  overdue: number;
  overduePercent: number | null;
  overdueDays: number;
  oldestOverdueDays: number;
  overdueReadyToShip: number;
  overduePackaging: number;
  dueSoon: number;
  missingDueDate: number;
  shipped: number;
  shippedWithDueDate: number;
  onTimePercent: number | null;
  expectedWeeklyShipments: number | null;
  nearTermDemand: number;
};

export type DeliverySeverity = "critical" | "behind" | "watch" | "on_track" | "unknown";

export const DELIVERY_SEVERITY_LABELS: Record<DeliverySeverity, string> = {
  critical: "Critical delays",
  behind: "Running behind",
  watch: "Needs attention",
  on_track: "On track",
  unknown: "Insufficient data",
};

export type DeliveryBriefing = {
  date: string;
  recordedAt: number;
  metrics: DeliveryMetrics;
  severity: DeliverySeverity;
  summary: string;
  source: "ai" | "calculated";
  overdueChange: number | null;
};

export type DeliveryBriefingResponse = {
  report: DeliveryBriefing | null;
  pending: boolean;
};

function validDueKey(value: string | undefined): string | null {
  const key = value?.split("T")[0];
  if (!key || !/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const parsed = new Date(`${key}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(key) ? key : null;
}

export function calculateDeliveryMetrics(items: DeliveryItem[], today: string): DeliveryMetrics {
  const config = DELIVERY_BRIEFING_CONFIG;
  const historyStart = shiftDayKey(today, -config.historyDays);
  const upcomingEnd = shiftDayKey(today, config.upcomingDays);
  const metrics: DeliveryMetrics = {
    active: 0, overdue: 0, overduePercent: null, overdueDays: 0,
    oldestOverdueDays: 0, overdueReadyToShip: 0, overduePackaging: 0,
    dueSoon: 0, missingDueDate: 0, shipped: 0, shippedWithDueDate: 0,
    onTimePercent: null, expectedWeeklyShipments: null, nearTermDemand: 0,
  };
  let onTime = 0;
  for (const item of items) {
    if (!item.visible || item.deleted || item.onHold || item.status === ItemStatus.Hidden) continue;
    const due = validDueKey(item.dueDate);
    if (item.status === ItemStatus.Done) {
      if (!item.completedAt || !Number.isFinite(item.completedAt)) continue;
      const completedDate = new Date(item.completedAt);
      if (!Number.isFinite(completedDate.getTime())) continue;
      const completed = laDayKey(completedDate);
      // Only complete Pacific calendar days; the partial current day would dilute pace.
      if (completed < historyStart || completed >= today) continue;
      metrics.shipped += 1;
      if (due) {
        metrics.shippedWithDueDate += 1;
        if (completed <= due) onTime += 1;
      }
      continue;
    }
    metrics.active += 1;
    if (!due) {
      metrics.missingDueDate += 1;
      continue;
    }
    if (due < today) {
      const daysLate = dayDiffKeys(due, today);
      metrics.overdue += 1;
      metrics.overdueDays += daysLate;
      metrics.oldestOverdueDays = Math.max(metrics.oldestOverdueDays, daysLate);
      if (item.status === ItemStatus.At_The_Door) metrics.overdueReadyToShip += 1;
      if (item.status === ItemStatus.Packaging) metrics.overduePackaging += 1;
    } else if (due < upcomingEnd) {
      metrics.dueSoon += 1;
    }
  }
  const datedActive = metrics.active - metrics.missingDueDate;
  metrics.overduePercent = datedActive ? metrics.overdue / datedActive * config.percentScale : null;
  metrics.onTimePercent = metrics.shippedWithDueDate
    ? onTime / metrics.shippedWithDueDate * config.percentScale : null;
  metrics.expectedWeeklyShipments = metrics.shipped
    ? metrics.shipped / config.historyDays * config.upcomingDays : null;
  metrics.nearTermDemand = metrics.overdue + metrics.dueSoon;
  return metrics;
}

export function deliverySeverity(metrics: DeliveryMetrics): DeliverySeverity {
  const config = DELIVERY_BRIEFING_CONFIG;
  const reliableHistory = metrics.shippedWithDueDate >= config.minimumShippingSample;
  if ((metrics.overduePercent ?? 0) >= config.criticalOverduePercent
    || metrics.oldestOverdueDays >= config.criticalOldestDays
    || (reliableHistory && metrics.onTimePercent! < config.criticalOnTimePercent)) return "critical";
  if (metrics.overdue > 0
    || (reliableHistory && metrics.onTimePercent! < config.targetOnTimePercent)) return "behind";
  if (metrics.active === metrics.missingDueDate && !reliableHistory) return "unknown";
  if (metrics.missingDueDate > 0 || !reliableHistory
    || (metrics.expectedWeeklyShipments !== null && metrics.nearTermDemand > metrics.expectedWeeklyShipments)) return "watch";
  return "on_track";
}

export function fallbackDeliverySummary(metrics: DeliveryMetrics): string {
  const statements = [metrics.active
    ? `${metrics.overdue} of ${metrics.active} active order items are overdue; ${metrics.dueSoon} more are due in the next ${DELIVERY_BRIEFING_CONFIG.upcomingDays} days, including today.`
    : "There are no active order items awaiting completion."];
  if (metrics.overdue) statements.push(`The oldest is ${metrics.oldestOverdueDays} days late.`);
  if (metrics.overdueReadyToShip) statements.push(`Prioritize dispatch of the ${metrics.overdueReadyToShip} overdue items at the door.`);
  else if (metrics.overduePackaging) statements.push(`Prioritize finishing and dispatching the ${metrics.overduePackaging} overdue items in packaging.`);
  else if (metrics.overdue) statements.push("Review the oldest overdue work in the production planner first.");
  if (metrics.expectedWeeklyShipments !== null && metrics.nearTermDemand > metrics.expectedWeeklyShipments) {
    statements.push("Overdue work plus upcoming deadlines exceeds a week's output at the recent completion pace; review capacity and customer commitments.");
  }
  if (metrics.missingDueDate) statements.push(`${metrics.missingDueDate} active items have missing or invalid deadlines, so their lateness cannot be assessed.`);
  if (metrics.shippedWithDueDate < DELIVERY_BRIEFING_CONFIG.minimumShippingSample) statements.push("There is too little recent dated completion history to judge on-time performance reliably.");
  return statements.join(" ");
}

export async function buildDeliveryNarrative(
  metrics: DeliveryMetrics,
  overdueChange: number | null,
  generate: (prompt: string) => Promise<string>,
): Promise<Pick<DeliveryBriefing, "summary" | "source">> {
  try {
    const summary = (await generate(`Write a blunt, useful daily delivery briefing for a manufacturing company. Return plain text only, at most two short paragraphs. Explain how serious the delays are, whether overdue count improved or worsened from yesterday when available, and the highest priority actions justified by the data. Never invent causes, staffing, promised delivery dates, forecasts, or customer information. Status Done/completedAt is a proxy for dispatch, NOT carrier-confirmed shipping or delivery. Counts are order items, not unique customers or multi-item orders. Paused, hidden and deleted items are excluded. Due soon includes today and excludes already overdue items. Historical rate is from the previous ${DELIVERY_BRIEFING_CONFIG.historyDays} complete Pacific calendar days. Expected weekly shipments is a rough count-based pace comparison, not a capacity model; orders vary in effort. Missing history is unknown, not zero performance. Fewer than ${DELIVERY_BRIEFING_CONFIG.minimumShippingSample} dated completions is insufficient for a reliable percentage judgment. Do not contradict the calculated severity or promise recovery dates. Suggest actions only; no changes have been made.
Calculated severity: ${DELIVERY_SEVERITY_LABELS[deliverySeverity(metrics)]}
Change in overdue item count versus yesterday (positive is worse; null is unavailable): ${overdueChange}
Measured metrics: ${JSON.stringify(metrics)}`)).trim();
    if (!summary || summary.length > DELIVERY_BRIEFING_CONFIG.maxSummaryCharacters) throw new Error("Invalid briefing length");
    return { summary, source: "ai" };
  } catch {
    return { summary: fallbackDeliverySummary(metrics), source: "calculated" };
  }
}

export function isMidnightPacific(now = new Date()): boolean {
  const hour = new Intl.DateTimeFormat("en-US", {
    timeZone: DELIVERY_BRIEFING_CONFIG.timeZone, hour: "numeric", hourCycle: "h23",
  }).format(now);
  return Number(hour) === DELIVERY_BRIEFING_CONFIG.midnightHour;
}
