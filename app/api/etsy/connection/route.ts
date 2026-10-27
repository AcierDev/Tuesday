import { NextResponse } from "next/server";

import { getDb } from "@/app/api/db/connect";
import { ETSY_CONFIG } from "@/config/etsy";
import {
  etsyConnectionCollection,
  publicEtsyStatus,
  readEtsyConnection,
  type EtsyConnectionDocument,
} from "@/lib/etsy/connection-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTTP_BAD_REQUEST = 400;
const MAX_KEY_LENGTH = 200;
const KEY_PATTERN = /^[A-Za-z0-9_-]+$/;

const status = async () => {
  const db = await getDb();
  return NextResponse.json(publicEtsyStatus(await readEtsyConnection(db)));
};

export async function GET() {
  return status();
}

const isKey = (value: unknown): value is string =>
  typeof value === "string" && value.length <= MAX_KEY_LENGTH && KEY_PATTERN.test(value.trim());

/** Saves app keys and/or the import / tracking switches. New keys drop the old sign-in. */
export async function PUT(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "A JSON body is required." }, { status: HTTP_BAD_REQUEST });
  }
  const set: Partial<EtsyConnectionDocument> = {};
  const unset: Record<string, ""> = {};
  if (body.keystring !== undefined || body.sharedSecret !== undefined) {
    if (!isKey(body.keystring) || !isKey(body.sharedSecret)) {
      return NextResponse.json({ error: "Enter both the keystring and the shared secret." }, { status: HTTP_BAD_REQUEST });
    }
    set.keystring = body.keystring.trim();
    set.sharedSecret = body.sharedSecret.trim();
    Object.assign(unset, { tokens: "", shopId: "", shopName: "", userId: "", connectedAt: "", pendingAuth: "" });
  }
  for (const flag of ["importEnabled", "trackingPushEnabled"] as const) {
    if (body[flag] === undefined) continue;
    if (typeof body[flag] !== "boolean") {
      return NextResponse.json({ error: `${flag} must be true or false.` }, { status: HTTP_BAD_REQUEST });
    }
    set[flag] = body[flag];
  }
  const db = await getDb();
  await etsyConnectionCollection(db).updateOne(
    { _id: ETSY_CONFIG.documentId },
    { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
    { upsert: true }
  );
  return status();
}

/** Disconnects the shop (keeps the app keys). */
export async function DELETE() {
  const db = await getDb();
  await etsyConnectionCollection(db).updateOne(
    { _id: ETSY_CONFIG.documentId },
    { $unset: { tokens: "", shopId: "", shopName: "", userId: "", connectedAt: "", pendingAuth: "", syncLease: "" } }
  );
  return status();
}
