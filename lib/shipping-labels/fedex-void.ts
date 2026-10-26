import type { FedExCancelResult } from "@/lib/fedex-api";
import {
  planVoid,
  purchaseTrackingNumbers,
  type OrderPurchaseFields,
  type StoredPurchase,
  type VoidPlan,
} from "./purchase-records";

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_UNPROCESSABLE = 422;
const DEFAULT_SENDER_COUNTRY = "US";

export type FedExVoidDeps = {
  getOrder: (orderId: string) => Promise<OrderPurchaseFields | null>;
  cancel: (trackingNumber: string, senderCountryCode: string) => Promise<FedExCancelResult>;
  saveVoid: (orderId: string, plan: VoidPlan) => Promise<void>;
  /** Drops the voided boxes' trackers so they no longer affect order status. */
  removeTrackers: (orderId: string, trackingNumbers: string[]) => Promise<void>;
  /** Removes the voided label PDF so it can't be printed by mistake. */
  removeLabelFile: (filename: string) => Promise<void>;
  now: () => number;
};

export type FedExVoidOutcome =
  | { status: typeof HTTP_OK; voided: StoredPurchase; message: string; warnings: string[] }
  | { status: number; error: string };

export async function voidFedExLabel(
  input: { orderId: string; trackingNumber: string },
  deps: FedExVoidDeps
): Promise<FedExVoidOutcome> {
  const order = await deps.getOrder(input.orderId);
  if (!order) return { status: HTTP_NOT_FOUND, error: "Order not found." };

  const plan = planVoid(order, input.trackingNumber, deps.now());
  if (!plan) {
    return {
      status: HTTP_NOT_FOUND,
      error: "No purchased FedEx label with that tracking number on this order.",
    };
  }
  if (plan.alreadyVoided) {
    return { status: HTTP_CONFLICT, error: "This label is already voided." };
  }

  const masterTrackingNumber = plan.voided.trackingNumber ?? input.trackingNumber;
  const result = await deps.cancel(
    masterTrackingNumber,
    plan.voided.shipFrom?.country || DEFAULT_SENDER_COUNTRY
  );
  if (!result.cancelled) {
    return {
      status: HTTP_UNPROCESSABLE,
      error: `FedEx did not void this label: ${result.message}`,
    };
  }

  await deps.saveVoid(input.orderId, plan);

  const warnings: string[] = [];
  const trackingNumbers = purchaseTrackingNumbers(plan.voided);
  await deps.removeTrackers(input.orderId, trackingNumbers).catch((error) => {
    warnings.push(`Tracking was not cleared: ${error instanceof Error ? error.message : error}`);
  });
  if (plan.voided.labelFilename) {
    await deps.removeLabelFile(plan.voided.labelFilename).catch((error) => {
      warnings.push(`Label PDF was not removed: ${error instanceof Error ? error.message : error}`);
    });
  }

  return { status: HTTP_OK, voided: plan.voided, message: result.message, warnings };
}
