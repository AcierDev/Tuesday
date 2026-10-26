import { shiftDayKey } from "@/lib/debt-metrics";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧰 SNAPSHOT HELPERS — pure, shared by debt + backlog + health routes  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// "overwrite" is reserved for the daily cron (one fixed cutoff per day).
// Page-triggered POSTs use "insert-only" so browsing /orders or
// /stats/backlog can only fill a missing day, never rewrite a recorded one.
export type SnapshotWriteMode = "insert-only" | "overwrite";

export function buildSnapshotUpdate<T extends object>(
  snapshot: T,
  mode: SnapshotWriteMode
): { $set: T } | { $setOnInsert: T } {
  return mode === "overwrite" ? { $set: snapshot } : { $setOnInsert: snapshot };
}

// Vercel cron sends `Authorization: Bearer <CRON_SECRET>`. Fails closed: an
// unset secret rejects every request (the cron paths bypass site access in
// middleware, so an open route would be publicly callable).
export function isAuthorizedCronRequest(
  request: Request,
  secret: string | undefined = process.env.CRON_SECRET
): boolean {
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

export type SnapshotSeriesPoint = {
  date: string;
  value: number | null;
  recorded: boolean;
};

// Densify snapshot rows (sorted by date DESC, as queried) into one point per
// day of [earliestKey, earliestKey + days - 1]. Gaps after a known value carry
// it forward (recorded=false). Days before the first-ever snapshot — no row
// in the window yet and no seed row before the window — are null, so charts
// skip them instead of drawing a fake 0.
export function buildSnapshotSeries<R extends { date: string }>(
  rowsDesc: R[],
  earliestKey: string,
  days: number,
  valueOf: (row: R) => number
): SnapshotSeriesPoint[] {
  const byDate = new Map<string, number>();
  let lastKnown: number | null = null;
  for (const row of rowsDesc) {
    if (row.date >= earliestKey) {
      // Rows are desc; keep the first (newest-written duplicates are rare).
      if (!byDate.has(row.date)) byDate.set(row.date, valueOf(row));
    } else {
      // First row strictly before the window is the carry-forward seed.
      lastKnown = valueOf(row);
      break;
    }
  }

  const series: SnapshotSeriesPoint[] = [];
  for (let i = 0; i < days; i++) {
    const key = shiftDayKey(earliestKey, i);
    const recorded = byDate.has(key);
    if (recorded) lastKnown = byDate.get(key)!;
    series.push({ date: key, value: lastKnown, recorded });
  }
  return series;
}
