import { NextResponse } from "next/server";
import type { Document } from "mongodb";

import { getDb } from "@/app/api/db/connect";
import { reportingAccess } from "@/lib/reporting/auth";
import { parseReportingRecord } from "@/lib/reporting/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BATCH_RECORDS = 500;
const MAX_BODY_BYTES = 1024 * 1024;
const NO_STORE = { "Cache-Control": "private, no-store" };
const COLLECTION_PREFIX = "reporting-records";

export async function POST(request: Request) {
  const access = reportingAccess(request.headers.get("authorization"), "write");
  if (access !== "allowed") {
    return NextResponse.json(
      { error: access === "unconfigured" ? "Reporting write token is not configured." : "Unauthorized." },
      { status: access === "unconfigured" ? 503 : 401, headers: NO_STORE }
    );
  }

  try {
    const declaredLength = request.headers.get("content-length");
    if (declaredLength && Number(declaredLength) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Import is too large." }, { status: 413, headers: NO_STORE });
    }
    const body = await request.text();
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Import is too large." }, { status: 413, headers: NO_STORE });
    }
    const parsed: unknown = JSON.parse(body);
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    if (entries.length < 1 || entries.length > MAX_BATCH_RECORDS) {
      return NextResponse.json({ error: "Invalid import batch size." }, { status: 400, headers: NO_STORE });
    }
    const now = new Date().toISOString();
    const records = entries.map((entry) => parseReportingRecord(entry, now));
    const db = await getDb();
    const collection = db.collection<Document>(
      `${COLLECTION_PREFIX}-${process.env.NEXT_PUBLIC_MODE}`
    );
    await collection.createIndex({ key: 1 }, { unique: true, name: "report_record_key_unique" });
    await collection.bulkWrite(records.map((record) => ({
      replaceOne: {
        filter: { key: record.key },
        replacement: { ...record, importedAt: now },
        upsert: true,
      },
    })));
    return NextResponse.json({ imported: records.length, importedAt: now }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof SyntaxError || (error instanceof Error && error.message.startsWith("Invalid reporting field:"))) {
      return NextResponse.json({ error: error.message }, { status: 400, headers: NO_STORE });
    }
    console.error("Failed to import reporting records", error);
    return NextResponse.json({ error: "Reporting import failed." }, { status: 500, headers: NO_STORE });
  }
}
