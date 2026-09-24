import { dayDiffKeys, shiftDayKey } from "../debt-metrics";
import type { ReportWindow } from "./fulfillment";

const MAX_REPORT_DAYS = 366;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function validDay(value: string | null): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function parseCompletedWindow(
  start: string | null,
  end: string | null,
  today: string
): ReportWindow {
  if (!validDay(start) || !validDay(end) || !validDay(today)) {
    throw new Error("Use valid YYYY-MM-DD dates.");
  }
  const length = dayDiffKeys(start, end) + 1;
  if (length < 1 || length > MAX_REPORT_DAYS || end >= today) {
    throw new Error("Choose a completed date range within the reporting limit.");
  }
  return { start, end };
}

export function precedingWindow(window: ReportWindow): ReportWindow {
  const days = dayDiffKeys(window.start, window.end) + 1;
  return {
    start: shiftDayKey(window.start, -days),
    end: shiftDayKey(window.start, -1),
  };
}
