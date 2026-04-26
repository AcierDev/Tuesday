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
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / MS_PER_DAY
  );
}

// Returns the YYYY-MM-DD key offset by `days` calendar days from `key`.
export function shiftDayKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * MS_PER_DAY;
  return new Date(t).toISOString().slice(0, 10);
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
