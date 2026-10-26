import clientPromise from "../db/connect";
import { Item, ItemStatus } from "@/typings/types";
import { laDayKey } from "@/lib/debt-metrics";
import { parseSquareSize } from "@/lib/production-metrics";
import {
  buildSnapshotUpdate,
  type SnapshotWriteMode,
} from "../debt-snapshots/snapshot-helpers";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DB_NAME = "react-web-app";
const SNAPSHOTS_COLLECTION = `backlog-snapshots-${process.env.NEXT_PUBLIC_MODE}`;
const ITEMS_COLLECTION = `items-${process.env.NEXT_PUBLIC_MODE}`;

const BACKLOG_STATUSES: ItemStatus[] = [
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
];

export type BacklogSnapshot = {
  date: string; // YYYY-MM-DD in America/Los_Angeles
  squares: number;
  byStatus: Partial<Record<ItemStatus, number>>;
  recordedAt: number;
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 💾 RECORD                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// mode "insert-only" (page loads) keeps an already-recorded day untouched and
// skips the item scan; "overwrite" (cron) always re-records the day.
export async function recordTodayBacklogSnapshot(
  mode: SnapshotWriteMode = "insert-only"
): Promise<BacklogSnapshot> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const snapshots = db.collection<BacklogSnapshot>(SNAPSHOTS_COLLECTION);
  const date = laDayKey();

  if (mode === "insert-only") {
    const existing = await snapshots.findOne({ date }, { projection: { _id: 0 } });
    if (existing) return existing;
  }

  const items = await db
    .collection<Item>(ITEMS_COLLECTION)
    .find(
      {
        visible: true,
        deleted: false,
        // Held items are paused — excluded from the recorded backlog trend.
        onHold: { $ne: true },
        status: { $in: BACKLOG_STATUSES },
      },
      { projection: { size: 1, status: 1 } }
    )
    .toArray();

  const byStatus: Partial<Record<ItemStatus, number>> = {};
  let total = 0;
  for (const item of items) {
    const parsed = parseSquareSize(item.size);
    if (!parsed) continue;
    total += parsed.squares;
    byStatus[item.status] = (byStatus[item.status] ?? 0) + parsed.squares;
  }

  const snapshot: BacklogSnapshot = {
    date,
    squares: total,
    byStatus,
    recordedAt: Date.now(),
  };

  await snapshots.updateOne({ date }, buildSnapshotUpdate(snapshot, mode), {
    upsert: true,
  });

  return snapshot;
}

export {
  DB_NAME as BACKLOG_DB_NAME,
  SNAPSHOTS_COLLECTION as BACKLOG_SNAPSHOTS_COLLECTION,
};
