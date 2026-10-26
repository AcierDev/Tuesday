import clientPromise from "../db/connect";
import { Item, ItemStatus } from "@/typings/types";
import { computeDebtBreakdown, laDayKey } from "@/lib/debt-metrics";
import { buildSnapshotUpdate, type SnapshotWriteMode } from "./snapshot-helpers";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DB_NAME = "react-web-app";
const SNAPSHOTS_COLLECTION = `debt-snapshots-${process.env.NEXT_PUBLIC_MODE}`;
const ITEMS_COLLECTION = `items-${process.env.NEXT_PUBLIC_MODE}`;

export type DebtSnapshot = {
  date: string; // YYYY-MM-DD in America/Los_Angeles
  totalDebt: number;
  byStatus: Partial<Record<ItemStatus, number>>;
  recordedAt: number;
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 💾 RECORD                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// mode "insert-only" (page loads) keeps an already-recorded day untouched and
// skips the item scan; "overwrite" (cron) always re-records the day.
export async function recordTodayDebtSnapshot(
  mode: SnapshotWriteMode = "insert-only"
): Promise<DebtSnapshot> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);
  const snapshots = db.collection<DebtSnapshot>(SNAPSHOTS_COLLECTION);
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
        onHold: { $ne: true },
        status: { $nin: [ItemStatus.Done, ItemStatus.Hidden] },
      },
      { projection: { dueDate: 1, status: 1 } }
    )
    .toArray();

  const { total, byStatus } = computeDebtBreakdown(items);
  const snapshot: DebtSnapshot = {
    date,
    totalDebt: total,
    byStatus,
    recordedAt: Date.now(),
  };

  await snapshots.updateOne({ date }, buildSnapshotUpdate(snapshot, mode), {
    upsert: true,
  });

  return snapshot;
}

export {
  DB_NAME as DEBT_DB_NAME,
  SNAPSHOTS_COLLECTION as DEBT_SNAPSHOTS_COLLECTION,
};
