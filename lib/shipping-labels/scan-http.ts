import type { ShippingLabelRecord } from "@/types/shipping-labels";
import type { ManualShippingLabelTracking } from "./scanner";

const SUPPORTED_CARRIERS = new Set(["FedEx", "UPS", "USPS", "DHL"]);

export type ScanShippingLabelHttpDeps = {
  scan: (
    labelId: string,
    manual: ManualShippingLabelTracking | null
  ) => Promise<ShippingLabelRecord>;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readManualTracking(
  request: Request
): Promise<ManualShippingLabelTracking | null> {
  const text = await request.text();
  if (!text.trim()) return null;

  const value = JSON.parse(text) as Record<string, unknown>;
  if (
    typeof value.trackingNumber !== "string" ||
    typeof value.carrier !== "string" ||
    !SUPPORTED_CARRIERS.has(value.carrier)
  ) {
    throw new Error("Manual tracking information is invalid.");
  }
  return {
    trackingNumber: value.trackingNumber,
    carrier: value.carrier as ManualShippingLabelTracking["carrier"],
  };
}

export async function handleScanFutureLabel(
  request: Request,
  labelId: string,
  deps: ScanShippingLabelHttpDeps
): Promise<Response> {
  try {
    const record = await deps.scan(labelId, await readManualTracking(request));
    return json({ label: record });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Shipping label could not be scanned.";
    const status = /not found/i.test(message)
      ? 404
      : /invalid|could not be read/i.test(message)
        ? 400
        : 500;
    return json({ error: message }, status);
  }
}
