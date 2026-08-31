import { getDb } from "@/app/api/db/connect";
import { type OrderTrackingInfo, type Tracker } from "@/typings/types";
import { upsertTrackerProjection } from "@/lib/shipping-labels/tracker-projection";

const EASYPOST_API_KEY = process.env.EASYPOST_API_KEY;
const EASYPOST_BASE_URL = "https://api.easypost.com/v2";

export async function fetchTracker(
  trackingCode: string,
  carrier: string
): Promise<Tracker> {
  if (!EASYPOST_API_KEY) {
    throw new Error("Missing EASYPOST_API_KEY");
  }

  const easyPostCarrier = carrier === "FedEx" ? "FedExDefault" : carrier;
  const createResponse = await fetch(`${EASYPOST_BASE_URL}/trackers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${EASYPOST_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tracker: {
        tracking_code: trackingCode,
        carrier: easyPostCarrier,
      },
    }),
  });

  if (createResponse.ok) {
    return createResponse.json();
  }

  const listResponse = await fetch(
    `${EASYPOST_BASE_URL}/trackers?tracking_codes[]=${trackingCode}`,
    {
      headers: {
        Authorization: `Bearer ${EASYPOST_API_KEY}`,
      },
    }
  );

  if (!listResponse.ok) {
    const errorData = await listResponse.text();
    throw new Error(`Failed to retrieve tracker: ${errorData}`);
  }

  const listData = await listResponse.json();
  const tracker = listData.trackers?.[0] as Tracker | undefined;

  if (!tracker) {
    throw new Error("No tracking information found");
  }

  return tracker;
}

export async function createAndStoreTracker(
  orderId: string,
  trackingCode: string,
  carrier: string
): Promise<OrderTrackingInfo> {
  const tracker = await fetchTracker(trackingCode, carrier);
  const db = await getDb();
  const payload: OrderTrackingInfo = {
    orderId,
    trackers: [tracker],
  };

  await upsertTrackerProjection(db, orderId, tracker);

  return payload;
}
