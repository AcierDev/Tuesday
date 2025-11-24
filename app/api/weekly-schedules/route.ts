import { NextResponse } from "next/server";
import clientPromise from "../db/connect";
import { WeeklyScheduleData } from "@/typings/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const weekKey = searchParams.get("weekKey");

    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<WeeklyScheduleData>(
      `weeklySchedules-${process.env.NEXT_PUBLIC_MODE}`
    );

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

export async function PATCH(request: Request) {
  try {
    const client = await clientPromise;

    const db = client.db("react-web-app");
    const collection = db.collection<WeeklyScheduleData>(
      `weeklySchedules-${process.env.NEXT_PUBLIC_MODE}`
    );

    const schedule: WeeklyScheduleData = await request.json();

    // Remove _id from the schedule object if it exists
    const { _id, ...scheduleWithoutId } = schedule;

    // Update the schedule for the given week
    const result = await collection.updateOne(
      { weekKey: schedule.weekKey },
      { $set: scheduleWithoutId },
      { upsert: true }
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error updating schedule:", error);
    return NextResponse.json(
      { error: "Failed to update schedule" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const client = await clientPromise;
    const db = client.db("react-web-app");
    const collection = db.collection<WeeklyScheduleData>(
      `weeklySchedules-${process.env.NEXT_PUBLIC_MODE}`
    );

    const schedule: WeeklyScheduleData = await request.json();
    const { _id, ...scheduleWithoutId } = schedule;

    // Check if schedule already exists
    const existing = await collection.findOne({ weekKey: schedule.weekKey });
    if (existing) {
      return NextResponse.json(
        { error: "Schedule already exists for this week" },
        { status: 400 }
      );
    }

    // Insert new schedule
    const result = await collection.insertOne(scheduleWithoutId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating schedule:", error);
    return NextResponse.json(
      { error: "Failed to create schedule" },
      { status: 500 }
    );
  }
}
