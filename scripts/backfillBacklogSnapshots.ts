import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient } from "mongodb";

import { Activity, Item, ItemStatus } from "@/typings/types";
import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import { parseSquareSize } from "@/lib/production-metrics";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DEFAULT_DAYS = 365;
const SIZE_FIELD = "Size"; // ColumnTitles.Size value used in activity changes
const DB_NAME = "react-web-app";

const BACKLOG_STATUSES = new Set<ItemStatus>([
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
]);

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
type SizeEvent = { dayKey: string; ts: number; newSize: string | null };

type Timeline = {
  itemId: string;
  createdDay: string;
  completedDay: string | null;
  initialStatus: ItemStatus;
  initialSize: string | null;
  statusEvents: StatusEvent[];
  sizeEvents: SizeEvent[];
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

    let initialStatus: ItemStatus = item.status;
    let initialSize: string | null = item.size ?? null;
    let foundInitialStatus = false;
    let foundInitialSize = false;

    const statusEvents: StatusEvent[] = [];
    const sizeEvents: SizeEvent[] = [];

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
        } else if (ch.field === SIZE_FIELD) {
          if (!foundInitialSize && ch.oldValue !== undefined) {
            initialSize = (ch.oldValue as string) || null;
            foundInitialSize = true;
          }
          sizeEvents.push({
            dayKey,
            ts: a.timestamp,
            newSize: (ch.newValue as string) || null,
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
      initialSize,
      statusEvents,
      sizeEvents,
    });
  }
  return out;
}

function stateOnDay(
  tl: Timeline,
  dayKey: string
): { status: ItemStatus; size: string | null } | null {
  if (tl.createdDay > dayKey) return null;
  if (tl.completedDay && tl.completedDay <= dayKey) {
    return { status: ItemStatus.Done, size: tl.initialSize };
  }
  let status = tl.initialStatus;
  for (const ev of tl.statusEvents) {
    if (ev.dayKey <= dayKey) status = ev.newStatus;
    else break;
  }
  let size = tl.initialSize;
  for (const ev of tl.sizeEvents) {
    if (ev.dayKey <= dayKey) size = ev.newSize;
    else break;
  }
  return { status, size };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚚 MAIN                                                              ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const overwrite = args.includes("--overwrite");
  const daysArg = args.find((a) => a.startsWith("--days="));
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
      // Match the live snapshotter: visible + not-deleted. We deliberately
      // include items that are now Done/Hidden — they were in backlog at
      // some point in the past, and our timeline reconstruction will resolve
      // them to their historical status correctly.
      { visible: true, deleted: false },
      {
        projection: {
          id: 1,
          status: 1,
          size: 1,
          createdAt: 1,
          completedAt: 1,
        },
      }
    )
    .toArray();
  console.log(`Loaded ${items.length} items`);

  const activities = await db
    .collection<Activity>(`activities-${mode}`)
    .find(
      { type: { $in: ["status_change", "update", "create"] } },
      { projection: { itemId: 1, timestamp: 1, type: 1, changes: 1 } }
    )
    .sort({ timestamp: 1 })
    .toArray();
  console.log(`Loaded ${activities.length} relevant activities`);

  const timelines = buildTimelines(items, activities);

  const today = laDayKey();
  const earliest = shiftDayKey(today, -(days - 1));

  type SnapshotRow = {
    date: string;
    squares: number;
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
      if (!BACKLOG_STATUSES.has(state.status)) continue;
      const parsed = parseSquareSize(state.size);
      if (!parsed) continue;
      total += parsed.squares;
      byStatus[state.status] =
        (byStatus[state.status] ?? 0) + parsed.squares;
    }

    snapshots.push({
      date: dayKey,
      squares: total,
      byStatus,
      recordedAt: Date.now(),
      backfilled: true,
    });
  }

  const stride = Math.max(1, Math.floor(days / 15));
  console.log("\nPreview (every ~" + stride + " days):");
  for (let i = 0; i < snapshots.length; i += stride) {
    const s = snapshots[i]!;
    console.log(`  ${s.date} → ${s.squares}`);
  }
  const last = snapshots[snapshots.length - 1];
  if (last) console.log(`  ${last.date} → ${last.squares} (today)`);

  if (dryRun) {
    console.log(`\nDry run — ${snapshots.length} snapshots NOT written`);
    await client.close();
    return;
  }

  const col = db.collection(`backlog-snapshots-${mode}`);

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
