import { NextResponse } from "next/server";

import { getDb } from "@/app/api/db/connect";
import { laDayKey } from "@/lib/debt-metrics";
import { getOverdueScheduleRemovals } from "@/lib/overdue-planner-orders";
import { type Item, type WeeklyScheduleData } from "@/typings/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };

export async function POST() {
  try {
    const db = await getDb();
    const mode = process.env.NEXT_PUBLIC_MODE;
    const todayKey = laDayKey();
    const schedulesCollection = db.collection<WeeklyScheduleData>(`weeklySchedules-${mode}`);
    const schedules = await schedulesCollection
      .find({ weekKey: { $lte: todayKey } })
      .toArray();
    const candidateIds = [...new Set(schedules.flatMap((week) =>
      Object.values(week.schedule).flat()
        .filter((entry) => !entry.done)
        .map((entry) => entry.id)
    ))];

    if (candidateIds.length === 0) {
      return NextResponse.json({ modifiedCount: 0 }, { headers: NO_STORE_HEADERS });
    }

    const items = await db.collection<Item>(`items-${mode}`)
      .find({
        id: { $in: candidateIds },
        visible: true,
        deleted: false,
      }, { projection: { _id: 0, id: 1, status: 1, onHold: 1, size: 1 } })
      .toArray();
    const removals = getOverdueScheduleRemovals(schedules, items, todayKey);

    if (removals.length === 0) {
      return NextResponse.json({ modifiedCount: 0 }, { headers: NO_STORE_HEADERS });
    }

    const result = await schedulesCollection.bulkWrite(removals.map(({ weekKey, day, ids }) => ({
      updateOne: {
        filter: { weekKey },
        update: {
          $pull: {
            [`schedule.${day}`]: { id: { $in: ids }, done: { $ne: true } },
          },
        },
      },
    })));

    return NextResponse.json(
      { modifiedCount: result.modifiedCount },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Failed to reconcile overdue planner orders:", error);
    return NextResponse.json(
      { error: "Failed to reconcile overdue planner orders" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
