import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import {
  emptyWeekSchedule,
  HTTP_CONFLICT,
  scheduleVersion,
  versionedScheduleFilter,
  type VersionedWeeklySchedule,
} from "./version";

async function getCollection() {
  const client = await clientPromise;
  const db = client.db("react-web-app");
  return db.collection<VersionedWeeklySchedule>(
    `weeklySchedules-${process.env.NEXT_PUBLIC_MODE}`
  );
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get("weekKey");

    const collection = await getCollection();
    const query = weekKey ? { weekKey } : {};
    const schedules = await collection.find(query).toArray();
    return NextResponse.json(schedules);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch schedules" },
      { status: 500 }
    );
  }
}

// Body: the whole week doc plus `version` = the version the edit was derived
// from. Succeeds only if the stored doc is still at that version (optimistic
// concurrency), then bumps it. 409 + the current doc when another writer
// (another tab, reconcile-overdue) changed the week first — the client
// refetches instead of overwriting their change.
export async function PATCH(request: Request) {
  try {
    const collection = await getCollection();
    const body: VersionedWeeklySchedule = await request.json();
    const { _id, version, ...scheduleWithoutId } = body;
    if (!body.weekKey) {
      return NextResponse.json({ error: "weekKey required" }, { status: 400 });
    }
    const baseVersion = scheduleVersion({ version });
    const nextVersion = baseVersion + 1;
    const nextDoc = { ...scheduleWithoutId, version: nextVersion };

    const result = await collection.updateOne(
      versionedScheduleFilter(body.weekKey, baseVersion),
      { $set: nextDoc }
    );

    if (result.matchedCount === 0) {
      // Either the week doesn't exist yet, or it moved past baseVersion.
      const created = await collection.updateOne(
        { weekKey: body.weekKey },
        { $setOnInsert: nextDoc },
        { upsert: true }
      );
      if (created.upsertedCount === 0) {
        const current = await collection.findOne({ weekKey: body.weekKey });
        return NextResponse.json(
          { error: "Schedule changed since it was loaded", current },
          { status: HTTP_CONFLICT }
        );
      }
    }

    return NextResponse.json({ ok: true, version: nextVersion });
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}

// Idempotent create: inserts an empty week only if none exists (keyed by
// weekKey via $setOnInsert, so concurrent creators converge on one doc) and
// returns the stored doc either way.
export async function POST(request: Request) {
  try {
    const collection = await getCollection();
    const body: VersionedWeeklySchedule = await request.json();
    if (!body.weekKey) {
      return NextResponse.json({ error: "weekKey required" }, { status: 400 });
    }

    await collection.updateOne(
      { weekKey: body.weekKey },
      {
        $setOnInsert: {
          weekKey: body.weekKey,
          schedule: body.schedule ?? emptyWeekSchedule(),
          version: 0,
        },
      },
      { upsert: true }
    );
    const schedule = await collection.findOne({ weekKey: body.weekKey });
    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}
