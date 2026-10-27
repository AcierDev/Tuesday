import { NextResponse } from "next/server";

import { getDb } from "@/app/api/db/connect";
import { beginEtsyAuthorization, EtsyNotConnectedError } from "@/lib/etsy/connection-server";
import { publicEtsyError } from "@/lib/etsy/sync-server";
import { etsyResultPage } from "../result-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTTP_BAD_REQUEST = 400;

/** Settings → Etsy → Connect opens this in a new tab; it forwards to Etsy's consent page. */
export async function GET() {
  try {
    return NextResponse.redirect(await beginEtsyAuthorization(await getDb()));
  } catch (error) {
    if (!(error instanceof EtsyNotConnectedError)) console.error("Etsy connect failed to start", error);
    return etsyResultPage(publicEtsyError(error, "Could not start the Etsy sign-in."), HTTP_BAD_REQUEST);
  }
}
