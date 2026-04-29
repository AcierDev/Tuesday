import { NextResponse } from "next/server";

import clientPromise from "../../db/connect";
import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import {
  bucketGluedSquaresByDay,
  buildGluedEvents,
  buildScheduledDayByItemId,
} from "@/lib/production-metrics";
import { Activity, Item, ItemStatus, WeeklyScheduleData } from "@/typings/types";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const DEFAULT_DAYS = 30;
const MAX_DAYS = 730;
const CACHE_CONTROL = "public, s-maxage=30, stale-while-revalidate=120";

const POST_GLUED_STATUSES: ItemStatus[] = [
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
  ItemStatus.Done,
];

// Fields needed to build glued events + render the timeline.
const ITEM_PROJECTION = {
  id: 1,
  status: 1,
  size: 1,
  customerName: 1,
  design: 1,
} as const;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📤 GET — server-computed glued events + daily buckets                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requested = parseInt(
      searchParams.get("days") || `${DEFAULT_DAYS}`,
      10
    );
    const days = Math.min(Math.max(requested, 1), MAX_DAYS);

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const mode = process.env.NEXT_PUBLIC_MODE;

    // Only items currently in a post-glued status can produce a glued event.
    // Filtering at the DB layer cuts the items walked from "all" to a slice.
    const items = (await db
      .collection<Item>(`items-${mode}`)
      .find(
        {
          visible: true,
          deleted: false,
          status: { $in: POST_GLUED_STATUSES },
        },
        { projection: ITEM_PROJECTION }
      )
      .toArray()) as unknown as Pick<
      Item,
      "id" | "status" | "size" | "customerName" | "design"
    >[];

    // Pull only the status_change activities for those items — narrow scan.
    const itemIds = items.map((i) => i.id);
    const activities = itemIds.length
      ? ((await db
          .collection<Activity>(`activities-${mode}`)
          .find({ type: "status_change", itemId: { $in: itemIds } })
          .toArray()) as unknown as Activity[])
      : [];

    // Calendar placement is the source of truth for the glue date — past-Wip
    // items are locked to their planner day, so that's when they were glued.
    const schedules = (await db
      .collection<WeeklyScheduleData>(`weeklySchedules-${mode}`)
      .find({}, { projection: { weekKey: 1, schedule: 1 } })
      .toArray()) as unknown as WeeklyScheduleData[];
    const scheduledDayByItemId = buildScheduledDayByItemId(schedules);

    const today = laDayKey();
    const start = shiftDayKey(today, -(days - 1));
    const allEvents = buildGluedEvents(activities, items, scheduledDayByItemId);
    const events = allEvents.filter(
      (e) => e.dayKey >= start && e.dayKey <= today
    );
    const buckets = bucketGluedSquaresByDay(events, start, today);

    return NextResponse.json(
      { events, buckets, range: { start, end: today, days } },
      { headers: { "Cache-Control": CACHE_CONTROL } }
    );
  } catch (error) {
    console.error("Failed to compute glued stats", error);
    return NextResponse.json(
      { error: "Failed to compute glued stats" },
      { status: 500 }
    );
  }
}
