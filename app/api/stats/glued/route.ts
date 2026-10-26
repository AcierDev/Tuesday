import { NextResponse } from "next/server";

import clientPromise from "../../db/connect";
import {
  dayDiffKeys,
  laDayKey,
  laDayStartMs,
  shiftDayKey,
} from "@/lib/debt-metrics";
import {
  bucketGluedSquaresByDay,
  buildGluedEvents,
  buildScheduledDayByItemId,
} from "@/lib/production-metrics";
import {
  Activity,
  DayName,
  Item,
  ItemStatus,
  WeeklyScheduleData,
} from "@/typings/types";

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

// How far before the window start a glue can be recorded and still land in
// the window: a planner week doc keyed up to 7 days before `start` can hold
// in-window days, and an item can be glued a few days before its planner day.
// Bounds both the schedules and the activities scanned per request.
const GLUE_ATTRIBUTION_BUFFER_DAYS = 7;

const SCHEDULE_DAYS: DayName[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

type ScheduleSlots = Pick<WeeklyScheduleData, "weekKey" | "schedule">;
const SCHEDULE_PROJECTION = { _id: 0, weekKey: 1, schedule: 1 } as const;
const ACTIVITY_PROJECTION = {
  _id: 0,
  itemId: 1,
  type: 1,
  timestamp: 1,
  changes: 1,
} as const;

function scheduledIds(schedules: ScheduleSlots[]): string[] {
  const ids = new Set<string>();
  for (const week of schedules) {
    for (const day of SCHEDULE_DAYS) {
      for (const entry of week.schedule?.[day] ?? []) ids.add(entry.id);
    }
  }
  return [...ids];
}

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
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const today = laDayKey();

    let start: string;
    let end: string;
    let days: number;
    if (startParam && endParam) {
      end = endParam;
      const requestedDays = dayDiffKeys(startParam, endParam) + 1;
      days = Math.min(Math.max(requestedDays, 1), MAX_DAYS);
      start = shiftDayKey(end, -(days - 1));
    } else {
      const requested = parseInt(
        searchParams.get("days") || `${DEFAULT_DAYS}`,
        10
      );
      days = Math.min(Math.max(requested, 1), MAX_DAYS);
      end = today;
      start = shiftDayKey(end, -(days - 1));
    }

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const mode = process.env.NEXT_PUBLIC_MODE;
    const schedulesCollection = db.collection<WeeklyScheduleData>(
      `weeklySchedules-${mode}`
    );

    // Every query is bounded by the requested window instead of loading all
    // history. An event lands in [start, end] only if its planner day or (for
    // unscheduled items) its latest glue crossing does, so:
    //   1. planner weeks from start − buffer (weeks are keyed by Sunday);
    //   2. status changes since start − buffer, plus the full history of the
    //      items those weeks schedule (their glue may predate the buffer);
    //   3. only the post-glued items those activities mention.
    const scheduleFloorKey = shiftDayKey(start, -GLUE_ATTRIBUTION_BUFFER_DAYS);
    const activityFloorMs = laDayStartMs(scheduleFloorKey);

    const recentSchedules = (await schedulesCollection
      .find(
        { weekKey: { $gte: scheduleFloorKey } },
        { projection: SCHEDULE_PROJECTION }
      )
      .toArray()) as unknown as ScheduleSlots[];
    const recentScheduledIds = scheduledIds(recentSchedules);

    const activities = (await db
      .collection<Activity>(`activities-${mode}`)
      .find(
        {
          type: "status_change",
          $or: [
            { timestamp: { $gte: activityFloorMs } },
            { itemId: { $in: recentScheduledIds } },
          ],
        },
        { projection: ACTIVITY_PROJECTION }
      )
      .toArray()) as unknown as Activity[];

    // Only items currently in a post-glued status can produce a glued event.
    const activityItemIds = [...new Set(activities.map((a) => a.itemId))];
    const items = activityItemIds.length
      ? ((await db
          .collection<Item>(`items-${mode}`)
          .find(
            {
              id: { $in: activityItemIds },
              visible: true,
              deleted: false,
              status: { $in: POST_GLUED_STATUSES },
            },
            { projection: ITEM_PROJECTION }
          )
          .toArray()) as unknown as Pick<
          Item,
          "id" | "status" | "size" | "customerName" | "design"
        >[])
      : [];

    // Calendar placement is the source of truth for the glue date — past-Wip
    // items are locked to their planner day, so that's when they were glued.
    // Items glued recently but parked on an older planner week keep that
    // older day (as before bounding), so look those few up explicitly.
    const recentScheduledSet = new Set(recentScheduledIds);
    const unplacedIds = items
      .map((i) => i.id)
      .filter((id) => !recentScheduledSet.has(id));
    const olderSchedules = unplacedIds.length
      ? ((await schedulesCollection
          .find(
            {
              weekKey: { $lt: scheduleFloorKey },
              $or: SCHEDULE_DAYS.map((day) => ({
                [`schedule.${day}.id`]: { $in: unplacedIds },
              })),
            },
            { projection: SCHEDULE_PROJECTION }
          )
          .toArray()) as unknown as ScheduleSlots[])
      : [];
    const scheduledDayByItemId = buildScheduledDayByItemId([
      ...olderSchedules,
      ...recentSchedules,
    ]);

    const allEvents = buildGluedEvents(activities, items, scheduledDayByItemId);
    const events = allEvents.filter(
      (e) => e.dayKey >= start && e.dayKey <= end
    );
    const buckets = bucketGluedSquaresByDay(events, start, end);

    return NextResponse.json(
      { events, buckets, range: { start, end, days } },
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
