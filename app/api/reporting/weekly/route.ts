import { NextResponse } from "next/server";
import type { Document } from "mongodb";

import { getDb } from "@/app/api/db/connect";
import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import { reportingAccess } from "@/lib/reporting/auth";
import { buildFulfillmentWeek, type TrackerSummary } from "@/lib/reporting/fulfillment";
import { completionEventsCollection } from "@/lib/reporting/completion-events-server";
import { summarizeMarketingWeek, type OrderLinkRecord, type ReportingRecord } from "@/lib/reporting/marketing";
import { parseCompletedWindow, precedingWindow } from "@/lib/reporting/window";
import type { Item } from "@/typings/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };
const DB_COLLECTION_PREFIX = "reporting-records";
const BACKLOG_SNAPSHOTS_PREFIX = "backlog-snapshots";
const HEALTH_SNAPSHOTS_PREFIX = "health-snapshots";
const BOUNDARY_BUFFER_DAYS = 3;

export async function GET(request: Request) {
  const access = reportingAccess(request.headers.get("authorization"), "read");
  if (access !== "allowed") {
    return NextResponse.json(
      { error: access === "unconfigured" ? "Reporting read token is not configured." : "Unauthorized." },
      { status: access === "unconfigured" ? 503 : 401, headers: NO_STORE }
    );
  }

  const params = new URL(request.url).searchParams;
  let current;
  try {
    current = parseCompletedWindow(params.get("start"), params.get("end"), laDayKey());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid date range." },
      { status: 400, headers: NO_STORE }
    );
  }
  const prior = precedingWindow(current);

  try {
    const db = await getDb();
    const itemsCollection = db.collection<Item>(`items-${process.env.NEXT_PUBLIC_MODE}`);
    const trackingCollection = db.collection<TrackerSummary>(`trackers-${process.env.NEXT_PUBLIC_MODE}`);
    const recordsCollection = db.collection<Document>(
      `${DB_COLLECTION_PREFIX}-${process.env.NEXT_PUBLIC_MODE}`
    );
    const broadEnd = shiftDayKey(current.end, BOUNDARY_BUFFER_DAYS);
    const [items, tracking, records, completionEvents, backlogSnapshots, healthSnapshots] = await Promise.all([
      itemsCollection.find(
        { visible: true, deleted: false },
        { projection: { _id: 0, id: 1, createdAt: 1, completedAt: 1,
          status: 1, dueDate: 1, dueDateAtCompletion: 1, originalDueDate: 1,
          size: 1, visible: 1, deleted: 1, onHold: 1 } }
      ).toArray(),
      trackingCollection.find(
        {},
        { projection: { _id: 0, orderId: 1,
          "trackers.tracking_details.status": 1, "trackers.tracking_details.datetime": 1 } }
      ).toArray(),
      recordsCollection.find({ $or: [
        { kind: { $in: ["shop", "social", "ad", "economics"] }, date: { $gte: prior.start, $lte: current.end } },
        { kind: "inquiry", start: { $gte: prior.start, $lte: current.end } },
        { kind: "cart", capturedAt: { $gte: `${prior.start}T00:00:00.000Z`, $lt: `${broadEnd}T00:00:00.000Z` } },
        { kind: "change", effectiveAt: { $gte: `${prior.start}T00:00:00.000Z`, $lt: `${broadEnd}T00:00:00.000Z` } },
        { kind: "order_link" },
      ] }).toArray(),
      completionEventsCollection(db).find({ completedAt: {
        $gte: Date.parse(`${shiftDayKey(prior.start, -1)}T00:00:00.000Z`),
        $lt: Date.parse(`${broadEnd}T00:00:00.000Z`),
      } }).toArray(),
      db.collection<{ date: string; squares: number; recordedAt: number }>(
        `${BACKLOG_SNAPSHOTS_PREFIX}-${process.env.NEXT_PUBLIC_MODE}`
      ).find({ date: { $in: [prior.end, current.end] } },
        { projection: { _id: 0, date: 1, squares: 1, recordedAt: 1 } }).toArray(),
      db.collection<{ date: string; score: number; recordedAt: number }>(
        `${HEALTH_SNAPSHOTS_PREFIX}-${process.env.NEXT_PUBLIC_MODE}`
      ).find({ date: { $in: [prior.end, current.end] } },
        { projection: { _id: 0, date: 1, score: 1, recordedAt: 1 } }).toArray(),
    ]);
    const now = Date.now();
    const reportingRecords = records as unknown as ReportingRecord[];
    const orderLinks = reportingRecords.filter((row): row is OrderLinkRecord => row.kind === "order_link");
    const snapshotsFor = (date: string) => ({
      backlog: backlogSnapshots.find((row) => row.date === date) ?? null,
      health: healthSnapshots.find((row) => row.date === date) ?? null,
    });
    return NextResponse.json({
      generatedAt: new Date(now).toISOString(),
      timeZone: "America/Los_Angeles",
      note: "Counts are production items; carrier acceptance requires an in_transit scan. Current backlog is an as-of-now snapshot for both periods.",
      current: {
        window: current,
        fulfillment: buildFulfillmentWeek(items, tracking, current, now, completionEvents, orderLinks),
        datedSnapshots: snapshotsFor(current.end),
        marketing: summarizeMarketingWeek(reportingRecords, current),
      },
      prior: {
        window: prior,
        fulfillment: buildFulfillmentWeek(items, tracking, prior, now, completionEvents, orderLinks),
        datedSnapshots: snapshotsFor(prior.end),
        marketing: summarizeMarketingWeek(reportingRecords, prior),
      },
    }, { headers: NO_STORE });
  } catch (error) {
    console.error("Failed to build weekly report", error);
    return NextResponse.json({ error: "Weekly report is temporarily unavailable." },
      { status: 503, headers: NO_STORE });
  }
}
