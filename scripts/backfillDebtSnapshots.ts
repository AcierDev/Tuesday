import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

import { Activity, Item, ItemStatus } from "@/typings/types";
import { dayDiffKeys, laDayKey, shiftDayKey } from "@/lib/debt-metrics";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DEFAULT_DAYS = 365;
const DUE_DATE_FIELD = "Due Date"; // ColumnTitles.Due value
const DB_NAME = "react-web-app";
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Items the user has decided not to count toward debt — typically orphaned
// orders that were never moved to Done/Hidden but aren't real obligations.
// Adding here only affects backfill; the live cron still sees them.
const EXCLUDED_ITEM_IDS = new Set<string>([
  "1743107493003", // Rodney mcgilberry (local!) — Coastal Dream
  "1756335703269", // Sensiba LLP (ignore) — tbd
  "cd0651dc-a990-498f-8c73-22cebb86bcc9", // [WF] Kathryn Cook — Mint
  "1d58be2a-2182-4ccf-9c81-ce50cbaf9a2f", // Saland Law — tbd
]);

function normalizeDayKey(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const head = raw.slice(0, 10);
  return DAY_KEY_RE.test(head) ? head : null;
}

const uri = process.env.MONGODB_URI;
const mode = process.env.NEXT_PUBLIC_MODE;

if (!uri) {
  console.error("MONGODB_URI not set — check .env.local");
  process.exit(1);
}
if (!mode) {
  console.error("NEXT_PUBLIC_MODE not set — check .env.local");
  process.exit(1);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧮 PER-ITEM TIMELINE                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

type StatusEvent = { dayKey: string; ts: number; newStatus: ItemStatus };
type DueEvent = { dayKey: string; ts: number; newDue: string | null };

type Timeline = {
  itemId: string;
  createdDay: string;
  completedDay: string | null; // hard cap — once completed, treat as Done
  initialStatus: ItemStatus;
  initialDue: string | null;
  statusEvents: StatusEvent[]; // ascending by ts
  dueEvents: DueEvent[]; // ascending by ts
};

function buildTimelines(items: Item[], activities: Activity[]): Timeline[] {
  const byItem = new Map<string, Activity[]>();
  for (const a of activities) {
    const list = byItem.get(a.itemId) ?? [];
    list.push(a);
    byItem.set(a.itemId, list);
  }

  const out: Timeline[] = [];
  for (const item of items) {
    const acts = (byItem.get(item.id) ?? [])
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp);

    // Walk forward, collecting events. The first activity that mutates a
    // field tells us the value *before* that mutation via oldValue — that's
    // our initial value. Otherwise the current item value is our best guess.
    let initialStatus: ItemStatus = item.status;
    let initialDue: string | null = normalizeDayKey(item.dueDate);
    let foundInitialStatus = false;
    let foundInitialDue = false;

    const statusEvents: StatusEvent[] = [];
    const dueEvents: DueEvent[] = [];

    for (const a of acts) {
      const dayKey = laDayKey(new Date(a.timestamp));
      for (const ch of a.changes ?? []) {
        if (ch.field === "status") {
          if (!foundInitialStatus && ch.oldValue !== undefined) {
            initialStatus = (ch.oldValue as ItemStatus) || initialStatus;
            foundInitialStatus = true;
          }
          statusEvents.push({
            dayKey,
            ts: a.timestamp,
            newStatus: ch.newValue as ItemStatus,
          });
        } else if (ch.field === DUE_DATE_FIELD) {
          if (!foundInitialDue && ch.oldValue !== undefined) {
            initialDue = normalizeDayKey(ch.oldValue);
            foundInitialDue = true;
          }
          dueEvents.push({
            dayKey,
            ts: a.timestamp,
            newDue: normalizeDayKey(ch.newValue),
          });
        }
      }
    }

    out.push({
      itemId: item.id,
      createdDay: laDayKey(new Date(item.createdAt)),
      completedDay: item.completedAt
        ? laDayKey(new Date(item.completedAt))
        : null,
      initialStatus,
      initialDue,
      statusEvents,
      dueEvents,
    });
  }
  return out;
}

// Status & dueDate as of `dayKey`. Events ≤ dayKey apply; later events don't.
// `completedDay` is a backstop for items whose status_change to Done isn't in
// the activity log (older items predating activity tracking).
function stateOnDay(
  tl: Timeline,
  dayKey: string
): { status: ItemStatus; due: string | null } | null {
  if (tl.createdDay > dayKey) return null;
  if (tl.completedDay && tl.completedDay <= dayKey) {
    return { status: ItemStatus.Done, due: tl.initialDue };
  }
  let status = tl.initialStatus;
  for (const ev of tl.statusEvents) {
    if (ev.dayKey <= dayKey) status = ev.newStatus;
    else break;
  }
  let due = tl.initialDue;
  for (const ev of tl.dueEvents) {
    if (ev.dayKey <= dayKey) due = ev.newDue;
    else break;
  }
  return { status, due };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚚 MAIN                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const overwrite = args.includes("--overwrite");
  const daysArg = args.find((a) => a.startsWith("--days="));
  const diagnoseArg = args.find((a) => a.startsWith("--diagnose="));
  const diagnoseDay = diagnoseArg ? diagnoseArg.split("=")[1] : null;
  const days = daysArg ? parseInt(daysArg.split("=")[1] ?? "", 10) : DEFAULT_DAYS;

  if (!Number.isFinite(days) || days <= 0) {
    console.error(`Invalid --days=${daysArg}`);
    process.exit(1);
  }

  console.log(`Mode: ${mode}`);
  console.log(`Window: last ${days} days`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Overwrite existing: ${overwrite}`);

  const client = new MongoClient(uri!);
  await client.connect();
  const db = client.db(DB_NAME);

  const items = await db
    .collection<Item>(`items-${mode}`)
    .find(
      // Match the live snapshotter's filter so backfilled days are computed
      // over the same population the cron will record going forward.
      { visible: true, deleted: false },
      {
        projection: {
          id: 1,
          status: 1,
          dueDate: 1,
          createdAt: 1,
          completedAt: 1,
          customerName: 1,
          design: 1,
        },
      }
    )
    .toArray();
  console.log(`Loaded ${items.length} items`);

  const activities = await db
    .collection<Activity>(`activities-${mode}`)
    .find(
      { type: { $in: ["status_change", "update", "create"] } },
      {
        projection: {
          itemId: 1,
          timestamp: 1,
          type: 1,
          changes: 1,
        },
      }
    )
    .sort({ timestamp: 1 })
    .toArray();
  console.log(`Loaded ${activities.length} relevant activities`);

  const filteredItems = items.filter((it) => !EXCLUDED_ITEM_IDS.has(it.id));
  console.log(
    `Excluded ${items.length - filteredItems.length} item${items.length - filteredItems.length === 1 ? "" : "s"} via EXCLUDED_ITEM_IDS`
  );
  const timelines = buildTimelines(filteredItems, activities);
  const itemById = new Map(filteredItems.map((it) => [it.id, it]));

  const today = laDayKey();
  const earliest = shiftDayKey(today, -(days - 1));

  const scanArg = args.find((a) => a.startsWith("--scan-over="));
  if (scanArg) {
    const threshold = parseInt(scanArg.split("=")[1] ?? "60", 10);
    console.log(
      `\n🔍 Scan: items that ever exceeded ${threshold}d overdue in the last ${days} days\n`
    );
    type Peak = {
      itemId: string;
      label: string;
      peakDays: number;
      peakDay: string;
      due: string;
      status: ItemStatus;
    };
    const peaks = new Map<string, Peak>();
    for (let i = 0; i < days; i++) {
      const dayKey = shiftDayKey(earliest, i);
      for (const tl of timelines) {
        const state = stateOnDay(tl, dayKey);
        if (!state) continue;
        if (
          state.status === ItemStatus.Done ||
          state.status === ItemStatus.Hidden
        )
          continue;
        if (!state.due) continue;
        const diff = dayDiffKeys(state.due, dayKey);
        if (diff <= threshold) continue;
        const cur = peaks.get(tl.itemId);
        if (!cur || diff > cur.peakDays) {
          const item = itemById.get(tl.itemId);
          const label =
            [item?.customerName, item?.design].filter(Boolean).join(" · ") ||
            tl.itemId;
          peaks.set(tl.itemId, {
            itemId: tl.itemId,
            label,
            peakDays: diff,
            peakDay: dayKey,
            due: state.due,
            status: state.status,
          });
        }
      }
    }
    const rows = Array.from(peaks.values()).sort(
      (a, b) => b.peakDays - a.peakDays
    );
    console.log(`Found ${rows.length} items\n`);
    for (const r of rows) {
      console.log(
        `  ${String(r.peakDays).padStart(4)}d peak on ${r.peakDay} · due ${r.due} · ${r.status.padEnd(12)} · ${r.label} · id=${r.itemId}`
      );
    }
    await client.close();
    return;
  }

  if (diagnoseDay) {
    console.log(`\n🔍 Diagnose ${diagnoseDay}: top contributors\n`);
    type Row = {
      itemId: string;
      label: string;
      status: ItemStatus;
      due: string;
      daysOverdue: number;
    };
    const rows: Row[] = [];
    for (const tl of timelines) {
      const state = stateOnDay(tl, diagnoseDay);
      if (!state) continue;
      if (
        state.status === ItemStatus.Done ||
        state.status === ItemStatus.Hidden
      )
        continue;
      if (!state.due) continue;
      const diff = dayDiffKeys(state.due, diagnoseDay);
      if (diff <= 0) continue;
      const item = itemById.get(tl.itemId);
      const label =
        [item?.customerName, item?.design].filter(Boolean).join(" · ") ||
        tl.itemId;
      rows.push({
        itemId: tl.itemId,
        label,
        status: state.status,
        due: state.due,
        daysOverdue: diff,
      });
    }
    rows.sort((a, b) => b.daysOverdue - a.daysOverdue);
    const total = rows.reduce((s, r) => s + r.daysOverdue, 0);
    console.log(`Total overdue: ${total}d across ${rows.length} items\n`);
    console.log(`Top 20 contributors:`);
    for (const r of rows.slice(0, 20)) {
      console.log(
        `  ${String(r.daysOverdue).padStart(4)}d · ${r.due} · ${r.status.padEnd(12)} · ${r.label}`
      );
    }
    await client.close();
    return;
  }

  type SnapshotRow = {
    date: string;
    totalDebt: number;
    byStatus: Partial<Record<ItemStatus, number>>;
    recordedAt: number;
    backfilled: boolean;
  };
  const snapshots: SnapshotRow[] = [];

  for (let i = 0; i < days; i++) {
    const dayKey = shiftDayKey(earliest, i);
    let total = 0;
    const byStatus: Partial<Record<ItemStatus, number>> = {};

    for (const tl of timelines) {
      const state = stateOnDay(tl, dayKey);
      if (!state) continue;
      if (
        state.status === ItemStatus.Done ||
        state.status === ItemStatus.Hidden
      )
        continue;
      if (!state.due) continue;
      const diff = dayDiffKeys(state.due, dayKey);
      if (diff <= 0) continue;
      total += diff;
      byStatus[state.status] = (byStatus[state.status] ?? 0) + diff;
    }

    snapshots.push({
      date: dayKey,
      totalDebt: total,
      byStatus,
      recordedAt: Date.now(),
      backfilled: true,
    });
  }

  // Print a preview so it's easy to eyeball — every Nth day, scaled to the
  // window so you see ~15 sample points regardless of --days.
  const stride = Math.max(1, Math.floor(days / 15));
  console.log("\nPreview (every ~" + stride + " days):");
  for (let i = 0; i < snapshots.length; i += stride) {
    const s = snapshots[i]!;
    console.log(`  ${s.date} → ${s.totalDebt}d`);
  }
  const last = snapshots[snapshots.length - 1];
  if (last) console.log(`  ${last.date} → ${last.totalDebt}d (today)`);

  if (dryRun) {
    console.log(`\nDry run — ${snapshots.length} snapshots NOT written`);
    await client.close();
    return;
  }

  const col = db.collection(`debt-snapshots-${mode}`);

  // Read existing snapshots in window so we don't clobber real recordings
  // unless --overwrite was passed.
  const existing = await col
    .find({ date: { $gte: earliest, $lte: today } })
    .project({ date: 1 })
    .toArray();
  const existingDates = new Set(existing.map((r) => r.date as string));

  let written = 0;
  let skipped = 0;
  for (const s of snapshots) {
    if (!overwrite && existingDates.has(s.date)) {
      skipped += 1;
      continue;
    }
    await col.updateOne({ date: s.date }, { $set: s }, { upsert: true });
    written += 1;
  }

  console.log(
    `\nWrote ${written} snapshots (skipped ${skipped} that already exist; pass --overwrite to replace)`
  );
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
