import clientPromise from "../db/connect";
import { Item, ItemStatus } from "@/typings/types";
import { computeDebtBreakdown, laDayKey } from "@/lib/debt-metrics";

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

export async function recordTodayDebtSnapshot(): Promise<DebtSnapshot> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const items = await db
    .collection<Item>(ITEMS_COLLECTION)
    .find(
      {
        visible: true,
        deleted: false,
        status: { $nin: [ItemStatus.Done, ItemStatus.Hidden] },
      },
      { projection: { dueDate: 1, status: 1 } }
    )
    .toArray();

  const { total, byStatus } = computeDebtBreakdown(items);
  const date = laDayKey();
  const snapshot: DebtSnapshot = {
    date,
    totalDebt: total,
    byStatus,
    recordedAt: Date.now(),
  };

  await db
    .collection<DebtSnapshot>(SNAPSHOTS_COLLECTION)
    .updateOne({ date }, { $set: snapshot }, { upsert: true });

  return snapshot;
}

export {
  DB_NAME as DEBT_DB_NAME,
  SNAPSHOTS_COLLECTION as DEBT_SNAPSHOTS_COLLECTION,
};
