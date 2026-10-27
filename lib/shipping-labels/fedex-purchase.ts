import type { FedExPurchaseResult } from "@/lib/fedex-api";
import type {
  ShippingAddressInput,
  ShippingBoxPreset,
  ShippingPurchaseDefaults,
} from "@/typings/types";
import {
  activePurchase,
  ETSY_PUSH_SKIPPED,
  PURCHASE_SOURCE_FEDEX_API,
  purchaseTrackingNumbers,
  type OrderPurchaseFields,
  type PurchasedShipmentRecord,
  type StoredPurchase,
} from "./purchase-records";

/** A crashed purchase request releases its order lock after this long. */
export const PURCHASE_LOCK_TTL_MS = 2 * 60 * 1000;

const HTTP_OK = 200;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_INTERNAL_ERROR = 500;

export type FedExPurchaseInput = {
  orderId: string;
  serviceType: string;
  shipFrom: ShippingAddressInput;
  shipTo: ShippingAddressInput;
  packages: ShippingBoxPreset[];
  purchaseDefaults: ShippingPurchaseDefaults;
  /** The user confirmed buying another label although one already exists. */
  confirmRepurchase: boolean;
  quotedNetCharge: number | null;
};

export type PurchasePatch = Partial<PurchasedShipmentRecord>;

export type FedExPurchaseDeps = {
  getOrder: (orderId: string) => Promise<OrderPurchaseFields | null>;
  claimPurchaseLock: (orderId: string, now: number) => Promise<boolean>;
  releasePurchaseLock: (orderId: string) => Promise<void>;
  purchase: (input: FedExPurchaseInput) => Promise<FedExPurchaseResult>;
  /** Sets `purchasedShipment` and appends to `purchasedShipments`. */
  savePurchase: (orderId: string, record: PurchasedShipmentRecord) => Promise<void>;
  updatePurchase: (
    orderId: string,
    purchaseId: string,
    patch: PurchasePatch,
    unsetFields: (keyof PurchasedShipmentRecord)[]
  ) => Promise<void>;
  createLabelFilename: (orderId: string) => Promise<string>;
  /** Uploads the label PDF and returns its URL. */
  uploadLabel: (filename: string, labelBuffer: Buffer) => Promise<string>;
  /** Called after a successful upload (e.g. to stamp the order's `labels`). */
  onLabelUploaded?: (orderId: string, filename: string) => Promise<void>;
  createTracker: (orderId: string, trackingNumber: string) => Promise<void>;
  /** Sends the tracking number to the order's Etsy receipt ("skipped" when it has none). */
  pushEtsyTracking?: (
    orderId: string,
    purchase: PurchasedShipmentRecord
  ) => Promise<"done" | typeof ETSY_PUSH_SKIPPED>;
  createId: () => string;
  now: () => number;
};

export type FedExPurchaseOutcome =
  | {
      status: typeof HTTP_OK;
      purchasedShipment: PurchasedShipmentRecord;
      warnings: string[];
    }
  | {
      status: number;
      error: string;
      existingPurchase?: StoredPurchase;
      trackingNumbers?: string[];
    };

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function existingPurchaseConflict(existing: StoredPurchase): FedExPurchaseOutcome {
  const tracking = purchaseTrackingNumbers(existing).join(", ");
  return {
    status: HTTP_CONFLICT,
    error: `This order already has a FedEx label (tracking ${tracking}). Confirm to buy another one.`,
    existingPurchase: existing,
  };
}

/**
 * Buys a FedEx label, records tracking + charge before anything else can fail,
 * then uploads the label and creates trackers as recorded, retryable steps.
 */
export async function purchaseFedExLabel(
  input: FedExPurchaseInput,
  deps: FedExPurchaseDeps
): Promise<FedExPurchaseOutcome> {
  const order = await deps.getOrder(input.orderId);
  if (!order) {
    return {
      status: HTTP_NOT_FOUND,
      error: "Order not found while saving purchased shipment.",
    };
  }
  const existing = activePurchase(order);
  if (existing && !input.confirmRepurchase) return existingPurchaseConflict(existing);

  if (!(await deps.claimPurchaseLock(input.orderId, deps.now()))) {
    return {
      status: HTTP_CONFLICT,
      error: "A label purchase for this order is already in progress.",
    };
  }

  try {
    // Re-check under the lock: another tab may have bought a label meanwhile.
    const lockedOrder = await deps.getOrder(input.orderId);
    const lockedExisting = activePurchase(lockedOrder);
    if (
      lockedExisting &&
      (!input.confirmRepurchase ||
        lockedExisting.trackingNumber !== existing?.trackingNumber)
    ) {
      return existingPurchaseConflict(lockedExisting);
    }

    const result = await deps.purchase(input);
    const labelFilename = await deps.createLabelFilename(input.orderId);
    const record: PurchasedShipmentRecord = {
      id: deps.createId(),
      source: PURCHASE_SOURCE_FEDEX_API,
      orderId: input.orderId,
      carrier: "FedEx",
      serviceType: result.serviceType,
      serviceName: result.serviceName,
      trackingNumber: result.trackingNumber,
      trackingNumbers: result.trackingNumbers,
      labelFilename,
      labelUrl: "",
      totalNetCharge: result.totalNetCharge,
      quotedNetCharge: input.quotedNetCharge,
      currency: result.currency,
      packages: input.packages,
      shipFrom: input.shipFrom,
      shipTo: input.shipTo,
      purchasedAt: deps.now(),
      labelStatus: result.labelBuffer ? "pending" : "failed",
      ...(result.labelBuffer
        ? { pendingLabelBase64: result.labelBuffer.toString("base64") }
        : {
            labelError:
              result.labelError ??
              "FedEx did not return a readable label; reprint it from FedEx.",
          }),
      trackerStatus: "pending",
      pendingTrackerNumbers: result.trackingNumbers,
      ...(deps.pushEtsyTracking ? { etsyStatus: "pending" as const } : {}),
    };

    try {
      await deps.savePurchase(input.orderId, record);
    } catch (error) {
      // The label is bought and billed; surface its tracking so nothing is lost.
      console.error("FedEx label bought but not saved", {
        orderId: input.orderId,
        trackingNumbers: result.trackingNumbers,
        error,
      });
      return {
        status: HTTP_INTERNAL_ERROR,
        error: `FedEx label was purchased (tracking ${result.trackingNumbers.join(", ")}) but could not be saved to the order: ${errorMessage(error, "database error")}. Do not buy again; record this tracking number.`,
        trackingNumbers: result.trackingNumbers,
      };
    }

    const completed = await completePurchaseFollowUps(
      input.orderId,
      record,
      deps
    );
    return { status: HTTP_OK, ...completed };
  } finally {
    await deps.releasePurchaseLock(input.orderId).catch((error) => {
      console.error("Failed to release FedEx purchase lock", error);
    });
  }
}

export type FollowUpDeps = Pick<
  FedExPurchaseDeps,
  "updatePurchase" | "uploadLabel" | "onLabelUploaded" | "createTracker" | "pushEtsyTracking"
>;

/**
 * Uploads a pending label and creates missing trackers. Each failure is saved
 * on the purchase record (and returned as a warning) so it can be retried.
 */
export async function completePurchaseFollowUps(
  orderId: string,
  purchase: PurchasedShipmentRecord,
  deps: FollowUpDeps
): Promise<{ purchasedShipment: PurchasedShipmentRecord; warnings: string[] }> {
  let current: PurchasedShipmentRecord = { ...purchase };
  const warnings: string[] = [];

  const apply = async (
    patch: PurchasePatch,
    unsetFields: (keyof PurchasedShipmentRecord)[] = []
  ) => {
    const next: Partial<PurchasedShipmentRecord> = { ...current, ...patch };
    for (const field of unsetFields) delete next[field];
    current = next as PurchasedShipmentRecord;
    try {
      await deps.updatePurchase(orderId, purchase.id, patch, unsetFields);
    } catch (error) {
      warnings.push(
        `Could not save follow-up status: ${errorMessage(error, "database error")}`
      );
    }
  };

  if (current.labelStatus !== "done") {
    if (!current.pendingLabelBase64) {
      const reason =
        current.labelError ?? "Label bytes are unavailable; reprint it from FedEx.";
      warnings.push(`Label not saved: ${reason}`);
      if (current.labelStatus !== "failed") {
        await apply({ labelStatus: "failed", labelError: reason });
      }
    } else {
      try {
        const labelUrl = await deps.uploadLabel(
          current.labelFilename,
          Buffer.from(current.pendingLabelBase64, "base64")
        );
        await apply({ labelStatus: "done", labelUrl }, [
          "pendingLabelBase64",
          "labelError",
        ]);
        await deps.onLabelUploaded?.(orderId, current.labelFilename);
      } catch (error) {
        const labelError = errorMessage(error, "Label upload failed.");
        warnings.push(`Label upload failed (retry from Shipping Labels): ${labelError}`);
        await apply({ labelStatus: "failed", labelError });
      }
    }
  }

  if (current.trackerStatus !== "done") {
    const numbers = current.pendingTrackerNumbers?.length
      ? current.pendingTrackerNumbers
      : purchaseTrackingNumbers(current);
    const failed: string[] = [];
    let trackerError: string | undefined;
    for (const trackingNumber of numbers) {
      try {
        await deps.createTracker(orderId, trackingNumber);
      } catch (error) {
        failed.push(trackingNumber);
        trackerError = errorMessage(error, "Tracker creation failed.");
      }
    }
    if (failed.length) {
      warnings.push(
        `Tracking not started for ${failed.join(", ")} (retry from Shipping Labels): ${trackerError}`
      );
      await apply({
        trackerStatus: "failed",
        trackerError,
        pendingTrackerNumbers: failed,
      });
    } else {
      await apply({ trackerStatus: "done" }, ["trackerError", "pendingTrackerNumbers"]);
    }
  }

  if (
    deps.pushEtsyTracking &&
    (current.etsyStatus === "pending" || current.etsyStatus === "failed")
  ) {
    try {
      const etsyStatus = await deps.pushEtsyTracking(orderId, current);
      await apply({ etsyStatus }, ["etsyError"]);
    } catch (error) {
      const etsyError = errorMessage(error, "Etsy tracking upload failed.");
      warnings.push(`Tracking not sent to Etsy (retry from Shipping Labels): ${etsyError}`);
      await apply({ etsyStatus: "failed", etsyError });
    }
  }

  return { purchasedShipment: current, warnings };
}
