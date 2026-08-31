import type {
  FutureLabelSummariesByOrder,
  ShippingLabelCarrier,
  ShippingLabelRecord,
} from "@/types/shipping-labels";
import type { IngestShippingLabelResult } from "./ingest";
import type { ShippingLabelPrintRequest } from "./print";

const JSON_CONTENT_TYPE = "application/json";

async function responseError(response: Response): Promise<Error> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body.error === "string") return new Error(body.error);
  } catch {
    // Fall through to the status-based message.
  }
  return new Error(`Shipping-label request failed (${response.status}).`);
}

async function requireJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw await responseError(response);
  return response.json() as Promise<T>;
}

export async function uploadFutureLabelFile(
  orderId: string,
  file: File
): Promise<IngestShippingLabelResult> {
  const body = new FormData();
  body.set("orderId", orderId);
  body.set("label", file);
  return requireJson<IngestShippingLabelResult>(
    await fetch("/api/shipping/labels/upload", { method: "POST", body })
  );
}

export async function listFutureLabels(
  orderId: string
): Promise<ShippingLabelRecord[]> {
  const query = new URLSearchParams({ orderId });
  const result = await requireJson<{ labels: ShippingLabelRecord[] }>(
    await fetch(`/api/shipping/labels?${query.toString()}`, {
      cache: "no-store",
    })
  );
  return result.labels;
}

export async function summarizeFutureLabels(): Promise<FutureLabelSummariesByOrder> {
  const result = await requireJson<{
    summaries: FutureLabelSummariesByOrder;
  }>(
    await fetch("/api/shipping/labels/summary", { cache: "no-store" })
  );
  return result.summaries;
}

export async function scanFutureLabel(
  labelId: string,
  manual?: { trackingNumber: string; carrier: ShippingLabelCarrier }
): Promise<ShippingLabelRecord> {
  const response = await fetch(
    `/api/shipping/labels/${encodeURIComponent(labelId)}/scan`,
    {
      method: "POST",
      ...(manual
        ? {
            headers: { "Content-Type": JSON_CONTENT_TYPE },
            body: JSON.stringify(manual),
          }
        : {}),
    }
  );
  const result = await requireJson<{ label: ShippingLabelRecord }>(response);
  return result.label;
}

export async function deleteFutureLabel(labelId: string): Promise<void> {
  const response = await fetch(
    `/api/shipping/labels/${encodeURIComponent(labelId)}`,
    { method: "DELETE" }
  );
  if (!response.ok) throw await responseError(response);
}

export async function requestFutureLabelPrint(
  request: ShippingLabelPrintRequest
): Promise<Blob> {
  const response = await fetch("/api/shipping/labels/print", {
    method: "POST",
    headers: { "Content-Type": JSON_CONTENT_TYPE },
    body: JSON.stringify(request),
  });
  if (!response.ok) throw await responseError(response);
  return response.blob();
}
