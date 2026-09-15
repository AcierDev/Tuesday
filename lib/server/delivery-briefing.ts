import { randomUUID } from "node:crypto";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { MongoServerError } from "mongodb";

import clientPromise from "@/app/api/db/connect";
import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import {
  buildDeliveryNarrative, calculateDeliveryMetrics, deliverySeverity,
  type DeliveryBriefing, type DeliveryBriefingResponse, type DeliveryItem,
} from "@/lib/delivery-briefing";

const DATABASE_NAME = "react-web-app";
const REPORT_COLLECTION = `delivery-briefings-${process.env.NEXT_PUBLIC_MODE}`;
const ITEM_COLLECTION = `items-${process.env.NEXT_PUBLIC_MODE}`;
const MODEL_NAME = process.env.GEMINI_BRIEFING_MODEL || "gemini-2.5-flash-lite";
const MODEL_TIMEOUT_MS = 30_000;
const MODEL_MAX_OUTPUT_TOKENS = 700;
const MODEL_TEMPERATURE = 0.2;
const LEASE_DURATION_MS = 90_000;
const DUPLICATE_KEY_ERROR = 11000;
const PREVIOUS_DAY_OFFSET = -1;

type ReportDocument = {
  _id: string;
  leaseUntil?: number;
  leaseToken?: string;
  report?: DeliveryBriefing;
};

async function generateSummary(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing Gemini key");
  const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: { temperature: MODEL_TEMPERATURE, maxOutputTokens: MODEL_MAX_OUTPUT_TOKENS },
  });
  const result = await model.generateContent(prompt, { timeout: MODEL_TIMEOUT_MS });
  return result.response.text();
}

// One report per Pacific date. A database lease prevents multiple tabs or
// overlapping cron invocations from paying for the same daily generation.
export async function getDeliveryBriefing(now = new Date()): Promise<DeliveryBriefingResponse> {
  const db = (await clientPromise).db(DATABASE_NAME);
  const reports = db.collection<ReportDocument>(REPORT_COLLECTION);
  const date = laDayKey(now);
  const current = await reports.findOne({ _id: date });
  if (current?.report) return { report: current.report, pending: false };

  const previous = await reports.findOne(
    { _id: { $lt: date }, report: { $exists: true } },
    { sort: { _id: -1 } },
  );
  const leaseToken = randomUUID();
  let claimed = false;
  try {
    const lease = await reports.findOneAndUpdate(
      {
        _id: date, report: { $exists: false },
        $or: [{ leaseUntil: { $exists: false } }, { leaseUntil: { $lte: now.getTime() } }],
      },
      { $set: { leaseToken, leaseUntil: now.getTime() + LEASE_DURATION_MS } },
      { upsert: true, returnDocument: "after" },
    );
    claimed = lease?.leaseToken === leaseToken;
  } catch (error) {
    // The unique _id rejects an upsert if another worker holds the lease.
    if (!(error instanceof MongoServerError && error.code === DUPLICATE_KEY_ERROR)) throw error;
  }
  if (!claimed) {
    const latest = await reports.findOne({ _id: date });
    return { report: latest?.report ?? previous?.report ?? null, pending: !latest?.report };
  }

  try {
    const items = await db.collection<DeliveryItem>(ITEM_COLLECTION).find(
      { visible: true, deleted: false, onHold: { $ne: true } },
      { projection: { _id: 0, status: 1, dueDate: 1, completedAt: 1, visible: 1, deleted: 1, onHold: 1 } },
    ).toArray();
    const metrics = calculateDeliveryMetrics(items, date);
    const yesterday = shiftDayKey(date, PREVIOUS_DAY_OFFSET);
    const overdueChange = previous?.report?.date === yesterday
      ? metrics.overdue - previous.report.metrics.overdue : null;
    const narrative = await buildDeliveryNarrative(metrics, overdueChange, generateSummary);
    const report: DeliveryBriefing = {
      date, recordedAt: now.getTime(), metrics, severity: deliverySeverity(metrics),
      overdueChange, ...narrative,
    };
    const saved = await reports.updateOne(
      { _id: date, leaseToken },
      { $set: { report }, $unset: { leaseUntil: "", leaseToken: "" } },
    );
    if (!saved.matchedCount) return { report: previous?.report ?? null, pending: true };
    return { report, pending: false };
  } finally {
    // Also release after a database/read failure; expired leases cover crashes.
    await reports.updateOne({ _id: date, leaseToken }, { $unset: { leaseUntil: "", leaseToken: "" } });
  }
}
