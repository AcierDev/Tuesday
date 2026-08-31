import type { ShippingLabelRecord } from "@/types/shipping-labels";
import { mergePdfPages } from "./pdf";
import { classifyShippingLabel } from "./status";

export type ShippingLabelPrintRequest =
  | { orderId: string; scope: "unused" }
  | { orderId: string; labelIds: string[] };

export type ShippingLabelPrintDeps = {
  listLabels: (orderId: string) => Promise<ShippingLabelRecord[]>;
  getObject: (key: string) => Promise<Buffer>;
};

function compareInventoryOrder(
  left: ShippingLabelRecord,
  right: ShippingLabelRecord
): number {
  return (
    left.createdAt - right.createdAt ||
    left.uploadId.localeCompare(right.uploadId) ||
    left.pageNumber - right.pageNumber
  );
}

function invalidSelection(orderId: string): Error {
  return new Error(
    `Print selection must contain distinct unused labels from order ${orderId}.`
  );
}

function selectUnusedLabels(
  request: ShippingLabelPrintRequest,
  records: ShippingLabelRecord[]
): ShippingLabelRecord[] {
  const orderLabels = records.filter(
    (record) => record.orderId === request.orderId
  );

  if ("scope" in request) {
    return orderLabels
      .filter((record) => classifyShippingLabel(record) === "unused")
      .sort(compareInventoryOrder);
  }

  const distinctIds = new Set(request.labelIds);
  if (
    request.labelIds.length === 0 ||
    distinctIds.size !== request.labelIds.length
  ) {
    throw invalidSelection(request.orderId);
  }

  const byId = new Map(orderLabels.map((record) => [record.id, record]));
  const selected = request.labelIds.map((id) => byId.get(id));
  if (
    selected.some(
      (record) => !record || classifyShippingLabel(record) !== "unused"
    )
  ) {
    throw invalidSelection(request.orderId);
  }

  return (selected as ShippingLabelRecord[]).sort(compareInventoryOrder);
}

export async function buildShippingLabelPrintPdf(
  request: ShippingLabelPrintRequest,
  deps: ShippingLabelPrintDeps
): Promise<Buffer> {
  const orderId = request.orderId.trim();
  if (!orderId) throw new Error("Order ID is required for label printing.");

  const normalizedRequest = { ...request, orderId } as ShippingLabelPrintRequest;
  const labels = selectUnusedLabels(
    normalizedRequest,
    await deps.listLabels(orderId)
  );
  if (labels.length === 0) {
    throw new Error(`No unused labels are available for order ${orderId}.`);
  }

  const pages = await Promise.all(
    labels.map((record) => deps.getObject(record.s3Key))
  );
  return mergePdfPages(pages);
}
