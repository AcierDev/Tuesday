import type { Item, PurchasedShipment } from "@/typings/types";

// Purchase bookkeeping stored on the order. `purchasedShipment` stays the
// latest live purchase (stats and the pickup badge read it); every purchase is
// also kept in `purchasedShipments` so a repurchase never overwrites history.

export type PurchaseFollowUpStatus = "pending" | "done" | "failed";

export const PURCHASE_SOURCE_FEDEX_API = "fedex-api";
export const PURCHASE_SOURCE_UPLOADED = "uploaded";
export const ETSY_PUSH_SKIPPED = "skipped";

export type PurchasedShipmentRecord = Omit<PurchasedShipment, "totalNetCharge"> & {
  id: string;
  source: typeof PURCHASE_SOURCE_FEDEX_API;
  /** Null when FedEx's response had no readable charge. */
  totalNetCharge: number | null;
  /** The quote shown when Buy was clicked. */
  quotedNetCharge: number | null;
  trackingNumbers: string[];
  labelStatus: PurchaseFollowUpStatus;
  labelError?: string;
  /** Label bytes kept only until the S3 upload succeeds, so it can be retried. */
  pendingLabelBase64?: string;
  trackerStatus: PurchaseFollowUpStatus;
  trackerError?: string;
  /** Tracking numbers whose EasyPost tracker still needs creating. */
  pendingTrackerNumbers?: string[];
  /**
   * Tracking sent to the order's Etsy receipt. Absent on purchases made before
   * the Etsy link existed (those are never sent); "skipped" = not an Etsy order.
   */
  etsyStatus?: PurchaseFollowUpStatus | typeof ETSY_PUSH_SKIPPED;
  etsyError?: string;
  voidedAt?: number;
};

/** Marker for labels bought elsewhere and uploaded: no cost, excluded from spend. */
export type UploadedLabelMarker = {
  orderId: string;
  carrier: string;
  source: typeof PURCHASE_SOURCE_UPLOADED;
  totalNetCharge: null;
  purchasedAt: number;
};

/** A purchase as stored, including pre-history documents without the newer fields. */
export type StoredPurchase = Omit<
  Partial<PurchasedShipmentRecord>,
  "source" | "carrier"
> & {
  source?: string;
  carrier?: string;
};

export type OrderPurchaseFields = {
  purchasedShipment?: StoredPurchase | PurchasedShipment | null;
  purchasedShipments?: StoredPurchase[];
};

export function orderPurchaseFields(item: Item | null | undefined): OrderPurchaseFields {
  return (item ?? {}) as OrderPurchaseFields;
}

/** A real, not-voided carrier purchase (uploaded-label markers don't count). */
export function isLivePurchase(
  purchase: StoredPurchase | PurchasedShipment | null | undefined
): boolean {
  if (!purchase) return false;
  const stored = purchase as StoredPurchase;
  return (
    stored.source !== PURCHASE_SOURCE_UPLOADED &&
    typeof stored.trackingNumber === "string" &&
    stored.trackingNumber.length > 0 &&
    !stored.voidedAt
  );
}

export function activePurchase(
  order: OrderPurchaseFields | null | undefined
): StoredPurchase | null {
  const latest = order?.purchasedShipment as StoredPurchase | null | undefined;
  return latest && isLivePurchase(latest) ? latest : null;
}

/** Every recorded purchase, oldest first, including a legacy single purchase. */
export function purchaseHistory(
  order: OrderPurchaseFields | null | undefined
): StoredPurchase[] {
  if (order?.purchasedShipments?.length) return order.purchasedShipments;
  const legacy = order?.purchasedShipment as StoredPurchase | null | undefined;
  return legacy && legacy.source !== PURCHASE_SOURCE_UPLOADED && legacy.trackingNumber
    ? [legacy]
    : [];
}

export function purchaseTrackingNumbers(purchase: StoredPurchase): string[] {
  const numbers = purchase.trackingNumbers?.length
    ? purchase.trackingNumbers
    : purchase.trackingNumber
      ? [purchase.trackingNumber]
      : [];
  return [...new Set(numbers)];
}

export function purchaseMatchesTracking(
  purchase: StoredPurchase,
  trackingNumber: string
): boolean {
  return purchaseTrackingNumbers(purchase).includes(trackingNumber);
}

export function hasPendingFollowUps(purchase: StoredPurchase): boolean {
  return (
    !purchase.voidedAt &&
    (purchase.labelStatus === "failed" ||
      purchase.labelStatus === "pending" ||
      purchase.trackerStatus === "failed" ||
      purchase.trackerStatus === "pending" ||
      purchase.etsyStatus === "failed")
  );
}

export type VoidPlan = {
  /** Every matching purchase was voided before; nothing to do. */
  alreadyVoided: boolean;
  voided: StoredPurchase;
  history: StoredPurchase[];
  /** New latest purchase; null to clear it; undefined to leave it untouched. */
  nextPurchasedShipment: StoredPurchase | null | undefined;
};

/**
 * Marks the purchase holding `trackingNumber` voided. The order's
 * `purchasedShipment` moves to the newest remaining live purchase (or is
 * cleared) only when it pointed at the voided one, so spend stats drop it.
 */
export function planVoid(
  order: OrderPurchaseFields,
  trackingNumber: string,
  now: number
): VoidPlan | null {
  const history = purchaseHistory(order);
  const matches = (purchase: StoredPurchase) =>
    purchaseMatchesTracking(purchase, trackingNumber);
  const liveIndex = history.findIndex(
    (purchase) => matches(purchase) && !purchase.voidedAt
  );
  const index = liveIndex >= 0 ? liveIndex : history.findIndex(matches);
  const target = history[index];
  if (!target) return null;
  if (target.voidedAt) {
    return {
      alreadyVoided: true,
      voided: target,
      history,
      nextPurchasedShipment: undefined,
    };
  }

  const voided: StoredPurchase = { ...target, voidedAt: now };
  const nextHistory = history.map((purchase, position) =>
    position === index ? voided : purchase
  );
  const latest = order.purchasedShipment as StoredPurchase | null | undefined;
  const latestIsVoided =
    !!latest &&
    latest.source !== PURCHASE_SOURCE_UPLOADED &&
    purchaseMatchesTracking(latest, trackingNumber);
  const remaining = [...nextHistory].reverse().find(isLivePurchase);

  return {
    alreadyVoided: false,
    voided,
    history: nextHistory,
    nextPurchasedShipment: latestIsVoided ? remaining ?? null : undefined,
  };
}
