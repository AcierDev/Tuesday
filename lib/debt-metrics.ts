import { Item, ItemStatus } from "@/typings/types";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const TIME_ZONE = "America/Los_Angeles";
const MS_PER_DAY = 1000 * 60 * 60 * 24;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📅 LA-LOCAL DAY HELPERS                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const dayKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// Calendar date in America/Los_Angeles, formatted YYYY-MM-DD.
export function laDayKey(d: Date = new Date()): string {
  return dayKeyFormatter.format(d);
}

// Calendar-day diff between two YYYY-MM-DD keys (b - a). Treats keys as
// labels via Date.UTC to sidestep DST drift.
export function dayDiffKeys(a: string, b: string): number {
  const [ay = Number.NaN, am = Number.NaN, ad = Number.NaN] = a.split("-").map(Number);
  const [by = Number.NaN, bm = Number.NaN, bd = Number.NaN] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / MS_PER_DAY
  );
}

// Returns the YYYY-MM-DD key offset by `days` calendar days from `key`.
export function shiftDayKey(key: string, days: number): string {
  const [y = Number.NaN, m = Number.NaN, d = Number.NaN] = key.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * MS_PER_DAY;
  return new Date(t).toISOString().slice(0, 10);
}

const zonedPartsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

// LA wall-clock minus UTC (ms) at the given instant: -7h in PDT, -8h in PST.
function laOffsetMs(utcMs: number): number {
  const wholeSecondMs = utcMs - (((utcMs % 1000) + 1000) % 1000);
  const parts = zonedPartsFormatter.formatToParts(new Date(wholeSecondMs));
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? Number.NaN);
  const wallAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second")
  );
  return wallAsUtc - wholeSecondMs;
}

// Epoch ms of `hour:minute` LA wall-clock time on the calendar day `key`.
// DST-safe: the offset is re-read at the candidate instant, so 20:00 on
// Nov 1 2026 resolves to PST and 00:00 on Mar 14 2027 to PST (springs
// forward at 02:00).
export function laWallClockMs(key: string, hour = 0, minute = 0): number {
  const [y = Number.NaN, m = Number.NaN, d = Number.NaN] = key.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, hour, minute);
  const firstGuess = wall - laOffsetMs(wall);
  return wall - laOffsetMs(firstGuess);
}

// Epoch ms of 00:00 LA on `key`.
export function laDayStartMs(key: string): number {
  return laWallClockMs(key, 0);
}

// Half-open [start, end) epoch-ms range covering LA calendar day `key`
// (23 or 25 hours long on DST transition days).
export function laDayRangeMs(key: string): { start: number; end: number } {
  return { start: laDayStartMs(key), end: laDayStartMs(shiftDayKey(key, 1)) };
}

// Ms from `now` until the next `hour:00` LA wall-clock time.
export function msUntilNextLaHour(hour: number, now: Date = new Date()): number {
  const nowMs = now.getTime();
  const today = laDayKey(now);
  const todayTarget = laWallClockMs(today, hour);
  const target =
    todayTarget > nowMs ? todayTarget : laWallClockMs(shiftDayKey(today, 1), hour);
  return target - nowMs;
}

function dueDateKey(due: string | undefined): string | null {
  if (!due) return null;
  // Items store dueDate as YYYY-MM-DD; trim any time portion defensively.
  const key = due.slice(0, 10);
  return key.length === 10 ? key : null;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 💰 DEBT COMPUTATION                                                  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Sum of overdue days across the given items, computed against today (LA).
export function computeTotalDebt(items: Item[]): number {
  const today = laDayKey();
  let debt = 0;
  for (const item of items) {
    const due = dueDateKey(item.dueDate);
    if (!due) continue;
    const diff = dayDiffKeys(due, today);
    if (diff > 0) debt += diff;
  }
  return debt;
}

export function computeDebtBreakdown(
  items: Pick<Item, "dueDate" | "status">[]
): { total: number; byStatus: Partial<Record<ItemStatus, number>> } {
  const today = laDayKey();
  const byStatus: Partial<Record<ItemStatus, number>> = {};
  let total = 0;
  for (const item of items) {
    const due = dueDateKey(item.dueDate);
    if (!due) continue;
    const diff = dayDiffKeys(due, today);
    if (diff <= 0) continue;
    total += diff;
    byStatus[item.status] = (byStatus[item.status] ?? 0) + diff;
  }
  return { total, byStatus };
}
