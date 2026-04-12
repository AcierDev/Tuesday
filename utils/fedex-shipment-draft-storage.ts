import type {
  ShippingAddressInput,
  ShippingPackagePreset,
  ShippingPurchaseDefaults,
} from "@/typings/types";

const KEY_PREFIX = "shadcn-panel:fedexShipmentDraft:v1:";

export type FedExShipmentDraft = {
  shipFrom: ShippingAddressInput;
  shipTo: ShippingAddressInput;
  packages: ShippingPackagePreset[];
  purchaseDefaults: ShippingPurchaseDefaults;
};

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isShippingAddressInput(v: unknown): v is ShippingAddressInput {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    isString(o.line1) &&
    isString(o.city) &&
    isString(o.state) &&
    isString(o.postalCode) &&
    isString(o.country) &&
    isString(o.name)
  );
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isShippingPackagePreset(v: unknown): v is ShippingPackagePreset {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.id) &&
    isFiniteNumber(o.length) &&
    isFiniteNumber(o.width) &&
    isFiniteNumber(o.height) &&
    isFiniteNumber(o.weight) &&
    o.length >= 0 &&
    o.width >= 0 &&
    o.height >= 0 &&
    o.weight >= 0
  );
}

function isShippingPurchaseDefaults(v: unknown): v is ShippingPurchaseDefaults {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    isNonEmptyString(o.pickupType) &&
    isNonEmptyString(o.packagingType) &&
    isNonEmptyString(o.labelStockType) &&
    isNonEmptyString(o.signatureOption)
  );
}

function isFedExShipmentDraft(v: unknown): v is FedExShipmentDraft {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (
    !isShippingAddressInput(o.shipFrom) ||
    !isShippingAddressInput(o.shipTo) ||
    !isShippingPurchaseDefaults(o.purchaseDefaults)
  ) {
    return false;
  }
  if (!Array.isArray(o.packages) || o.packages.length === 0) {
    return false;
  }
  return o.packages.every(isShippingPackagePreset);
}

function storageKey(itemId: string): string {
  return `${KEY_PREFIX}${itemId}`;
}

export function loadFedExShipmentDraft(itemId: string): FedExShipmentDraft | null {
  if (typeof window === "undefined" || !itemId) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey(itemId));
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isFedExShipmentDraft(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveFedExShipmentDraft(itemId: string, draft: FedExShipmentDraft): void {
  if (typeof window === "undefined" || !itemId) {
    return;
  }

  try {
    window.localStorage.setItem(storageKey(itemId), JSON.stringify(draft));
  } catch {
    // Quota, private mode, or disabled storage — ignore
  }
}

export function clearFedExShipmentDraft(itemId: string): void {
  if (typeof window === "undefined" || !itemId) {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey(itemId));
  } catch {
    // ignore
  }
}
