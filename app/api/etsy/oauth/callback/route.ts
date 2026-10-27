import { getDb } from "@/app/api/db/connect";
import { completeEtsyAuthorization, EtsyNotConnectedError } from "@/lib/etsy/connection-server";
import { publicEtsyError } from "@/lib/etsy/sync-server";
import { etsyResultPage } from "../result-page";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HTTP_BAD_REQUEST = 400;

// Etsy redirects here after the seller approves (or declines) access. This
// exact URL must be listed as a callback URL on the Etsy app.
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");
  if (params.get("error") || !code || !state) {
    const reason = params.get("error_description") || params.get("error") || "Etsy did not return a sign-in code.";
    return etsyResultPage(`Etsy was not connected: ${reason}`, HTTP_BAD_REQUEST);
  }
  try {
    const { shopName } = await completeEtsyAuthorization(await getDb(), code, state);
    return etsyResultPage(`Connected to ${shopName}. You can close this tab.`);
  } catch (error) {
    if (!(error instanceof EtsyNotConnectedError)) console.error("Etsy connect failed", error);
    return etsyResultPage(publicEtsyError(error, "Etsy sign-in failed; see the server log."), HTTP_BAD_REQUEST);
  }
}
