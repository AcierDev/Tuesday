import clientPromise from "../db/connect";
import { Item } from "@/typings/types";
import { laDayKey } from "@/lib/debt-metrics";
import { computeHealthScore } from "@/lib/production-metrics";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DB_NAME = "react-web-app";
const SNAPSHOTS_COLLECTION = `health-snapshots-${process.env.NEXT_PUBLIC_MODE}`;
const ITEMS_COLLECTION = `items-${process.env.NEXT_PUBLIC_MODE}`;

export type HealthSnapshot = {
  date: string; // YYYY-MM-DD in America/Los_Angeles
  score: number;
  recordedAt: number;
};

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 💾 RECORD                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// computeHealthScore needs full item history (Done included) to bucket
// completions and compute the on-time rate. Hidden items are excluded
// because they're invisible to the rest of the app.
export async function recordTodayHealthSnapshot(): Promise<HealthSnapshot> {
  const client = await clientPromise;
  const db = client.db(DB_NAME);

  const items = await db
    .collection<Item>(ITEMS_COLLECTION)
    .find(
      { visible: true, deleted: false },
      {
        projection: {
          dueDate: 1,
          status: 1,
          completedAt: 1,
          createdAt: 1,
          design: 1,
          size: 1,
          shippingDetails: 1,
        },
      }
    )
    .toArray();

  const { total } = computeHealthScore(items as Item[]);
  const date = laDayKey();
  const snapshot: HealthSnapshot = {
    date,
    score: total,
    recordedAt: Date.now(),
  };

  await db
    .collection<HealthSnapshot>(SNAPSHOTS_COLLECTION)
    .updateOne({ date }, { $set: snapshot }, { upsert: true });

  return snapshot;
}

export {
  DB_NAME as HEALTH_DB_NAME,
  SNAPSHOTS_COLLECTION as HEALTH_SNAPSHOTS_COLLECTION,
};
