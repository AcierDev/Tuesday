import type { ShippingDetails } from "../typings/types";

const COUNTRY_CODE_LENGTH = 2;
export const DEFAULT_ETSY_QUANTITY_INDEX = 1;
const SHIPPING_STRING_FIELDS = [
  "name", "company", "street1", "street2", "street3", "city", "state", "postalCode", "country", "phone", "buyer_email", "addressVerified",
] as const;
const NULLABLE_SHIPPING_FIELDS = new Set<string>(["company", "street3", "phone"]);
const ETSY_ID_FIELDS = ["receiptId", "transactionId"] as const;
const ADDRESS_FIELDS = [
  "name", "company", "street1", "street2", "street3", "city", "state", "postalCode", "country", "residential",
] as const;

export type EtsyOrderMetadata = { receiptId?: string; transactionId?: string; quantityIndex?: number };
export type ShippingUpdateMode = "merge" | "fillMissing";
type ShippingMetadata = { shippingDetails?: ShippingDetails; etsyOrder?: EtsyOrderMetadata };

export class OrderShippingValidationError extends Error {}

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

// Validate only the new shipping metadata contract; unrelated item fields keep their existing behavior.
export function normalizeOrderShippingInput<T extends Record<string, unknown>>(incoming: T): T & ShippingMetadata {
  if (Object.keys(incoming).some(field => field.startsWith("shippingDetails.") || field.startsWith("etsyOrder."))) {
    throw new OrderShippingValidationError("Shipping metadata must use shippingDetails and etsyOrder objects");
  }
  const normalized: Record<string, unknown> = { ...incoming };
  if (Object.hasOwn(incoming, "shippingDetails")) {
    if (!isPlainRecord(incoming.shippingDetails)) {
      throw new OrderShippingValidationError("shippingDetails must be an object");
    }
    const shippingDetails: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(incoming.shippingDetails)) {
      if (field === "residential") {
        if (typeof value !== "boolean") throw new OrderShippingValidationError("shippingDetails.residential must be a boolean");
      } else {
        if (!SHIPPING_STRING_FIELDS.includes(field as typeof SHIPPING_STRING_FIELDS[number])) {
          throw new OrderShippingValidationError(`Unknown shippingDetails field: ${field}`);
        }
        if (typeof value !== "string" && !(value === null && NULLABLE_SHIPPING_FIELDS.has(field))) {
          throw new OrderShippingValidationError(`shippingDetails.${field} must be a string${NULLABLE_SHIPPING_FIELDS.has(field) ? " or null" : ""}`);
        }
      }
      if (field === "country") {
        const country = (value as string).trim().toUpperCase();
        if (country && (country.length !== COUNTRY_CODE_LENGTH || !/^[A-Z]+$/.test(country))) {
          throw new OrderShippingValidationError("shippingDetails.country must be a two-letter country code");
        }
        shippingDetails[field] = country;
      } else {
        shippingDetails[field] = value;
      }
    }
    normalized.shippingDetails = shippingDetails;
  }
  if (Object.hasOwn(incoming, "etsyOrder")) {
    if (!isPlainRecord(incoming.etsyOrder)) throw new OrderShippingValidationError("etsyOrder must be an object");
    const etsyOrder: EtsyOrderMetadata = {};
    for (const [field, value] of Object.entries(incoming.etsyOrder)) {
      if (field === "quantityIndex") {
        if (typeof value !== "number" || !Number.isSafeInteger(value) || value < DEFAULT_ETSY_QUANTITY_INDEX) {
          throw new OrderShippingValidationError("etsyOrder.quantityIndex must be a positive integer");
        }
        etsyOrder.quantityIndex = value;
        continue;
      }
      if (!ETSY_ID_FIELDS.includes(field as typeof ETSY_ID_FIELDS[number])) {
        throw new OrderShippingValidationError(`Unknown etsyOrder field: ${field}`);
      }
      if (typeof value !== "string" || (value !== "" && !/^\d+$/.test(value))) {
        throw new OrderShippingValidationError(`etsyOrder.${field} must be a digit string or empty string`);
      }
      etsyOrder[field as typeof ETSY_ID_FIELDS[number]] = value;
    }
    normalized.etsyOrder = etsyOrder;
  }
  return normalized as T & ShippingMetadata;
}

function isMissing(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && value.trim() === "");
}

export function mergeOrderShippingPatch<T extends Record<string, unknown>>(
  current: ShippingMetadata,
  incoming: T,
  mode: ShippingUpdateMode = "merge"
): T & ShippingMetadata {
  const updates = normalizeOrderShippingInput(incoming);
  if (updates.shippingDetails) {
    const merged = { ...current.shippingDetails };
    for (const [field, value] of Object.entries(updates.shippingDetails)) {
      if (mode === "merge" || isMissing(merged[field as keyof ShippingDetails])) {
        Object.assign(merged, { [field]: value });
      }
    }
    const changedAddress = ADDRESS_FIELDS.some(field => {
      const previous = current.shippingDetails?.[field];
      const next = merged[field];
      return field === "country" && typeof previous === "string" && typeof next === "string"
        ? previous.trim().toUpperCase() !== next.trim().toUpperCase()
        : previous !== next;
    });
    if (changedAddress) merged.addressVerified = "";
    updates.shippingDetails = merged as ShippingDetails;
  }
  if (updates.etsyOrder) {
    const merged = { ...current.etsyOrder };
    for (const [field, value] of Object.entries(updates.etsyOrder)) {
      if (mode === "merge" || isMissing(merged[field as keyof EtsyOrderMetadata])) {
        Object.assign(merged, { [field]: value });
      }
    }
    if (merged.receiptId && merged.transactionId && merged.quantityIndex === undefined) {
      merged.quantityIndex = DEFAULT_ETSY_QUANTITY_INDEX;
    }
    updates.etsyOrder = merged;
  }
  return updates;
}


export function etsyOrderIdentityFilter(etsyOrder: EtsyOrderMetadata): Record<string, unknown> {
  const quantityIndex = etsyOrder.quantityIndex ?? DEFAULT_ETSY_QUANTITY_INDEX;
  return {
    "etsyOrder.receiptId": etsyOrder.receiptId,
    "etsyOrder.transactionId": etsyOrder.transactionId,
    ...(quantityIndex === DEFAULT_ETSY_QUANTITY_INDEX
      ? { $or: [
          { "etsyOrder.quantityIndex": DEFAULT_ETSY_QUANTITY_INDEX },
          { "etsyOrder.quantityIndex": { $exists: false } },
        ] }
      : { "etsyOrder.quantityIndex": quantityIndex }),
  };
}
