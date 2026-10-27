import type {
  ShippingAddressInput,
  ShippingBoxPreset,
  ShippingPurchaseDefaults,
} from "@/typings/types";
import type { FedExAddressInput } from "@/lib/fedex-api";
import type { FedExPurchaseInput } from "./fedex-purchase";
import type { StoredPurchase } from "./purchase-records";

/** Domestic only: international labels need customs data this flow can't send. */
export const SUPPORTED_DESTINATION_COUNTRY = "US";
export const INTERNATIONAL_NOT_SUPPORTED_MESSAGE =
  "International shipments need customs details, which this dialog doesn't support. Create this label in FedEx Ship Manager instead.";
const ACCOUNT_ID_PATTERN = /^[\w-]{1,32}$/;
// Order ids become S3 label filenames, so they must be plain names.
const SAFE_ORDER_ID_PATTERN = /^[\w.-]+$/;
const ADDRESS_REQUIRED_FIELDS = ["postalCode", "country"] as const;
const RECIPIENT_REQUIRED_FIELDS = ["line1", "city", "state"] as const;

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isPositiveNumber(value: unknown): boolean {
  const number = Number(value);
  return value !== null && value !== "" && Number.isFinite(number) && number > 0;
}

// Saved addresses may carry the full country name instead of the ISO code.
const US_COUNTRY_ALIASES = new Set(["US", "USA", "UNITED STATES", "UNITED STATES OF AMERICA"]);

/** ISO country code for FedEx: US name variants become "US"; others are trimmed. */
export function normalizeCountryCode(country: string | null | undefined): string {
  const trimmed = (country || "").trim();
  return US_COUNTRY_ALIASES.has(trimmed.toUpperCase()) ? SUPPORTED_DESTINATION_COUNTRY : trimmed;
}

export function isDomesticDestination(address: Pick<ShippingAddressInput, "country">): boolean {
  return normalizeCountryCode(address.country) === SUPPORTED_DESTINATION_COUNTRY;
}

function parseAddress(
  value: unknown,
  label: string,
  requiredFields: readonly (keyof ShippingAddressInput)[]
): ParseResult<FedExAddressInput> {
  if (!isRecord(value)) return { ok: false, error: `${label} address is required.` };
  for (const field of requiredFields) {
    const fieldValue = value[field];
    if (typeof fieldValue !== "string" || !fieldValue.trim()) {
      return { ok: false, error: `${label} ${field} is required.` };
    }
  }
  return { ok: true, value: value as FedExAddressInput };
}

/** A recipient address on its own (address validation has no ship-from or boxes). */
export function parseFedExRecipientAddress(value: unknown): ParseResult<FedExAddressInput> {
  return parseAddress(value, "Recipient", [...ADDRESS_REQUIRED_FIELDS, ...RECIPIENT_REQUIRED_FIELDS]);
}

function parsePackages(value: unknown): ParseResult<ShippingBoxPreset[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return { ok: false, error: "At least one box is required." };
  }
  const valid = value.every(
    (pkg) =>
      isRecord(pkg) &&
      isPositiveNumber(pkg.length) &&
      isPositiveNumber(pkg.width) &&
      isPositiveNumber(pkg.height) &&
      isPositiveNumber(pkg.weight)
  );
  return valid
    ? { ok: true, value: value as ShippingBoxPreset[] }
    : { ok: false, error: "Each package must include positive dimensions and weight." };
}

export type FedExRateRequestInput = {
  shipFrom: FedExAddressInput;
  shipTo: FedExAddressInput;
  packages: ShippingBoxPreset[];
  purchaseDefaults: Partial<ShippingPurchaseDefaults> | undefined;
};

export function parseFedExRateRequest(payload: unknown): ParseResult<FedExRateRequestInput> {
  if (!isRecord(payload)) return { ok: false, error: "Invalid request body." };
  const shipFrom = parseAddress(payload.shipFrom, "Ship-from", ADDRESS_REQUIRED_FIELDS);
  if (!shipFrom.ok) return shipFrom;
  const shipTo = parseAddress(payload.shipTo, "Recipient", [
    ...ADDRESS_REQUIRED_FIELDS,
    ...RECIPIENT_REQUIRED_FIELDS,
  ]);
  if (!shipTo.ok) return shipTo;
  if (!isDomesticDestination(shipTo.value)) {
    return { ok: false, error: INTERNATIONAL_NOT_SUPPORTED_MESSAGE };
  }
  const packages = parsePackages(payload.packages);
  if (!packages.ok) return packages;

  return {
    ok: true,
    value: {
      shipFrom: shipFrom.value,
      shipTo: shipTo.value,
      packages: packages.value,
      purchaseDefaults: isRecord(payload.purchaseDefaults)
        ? (payload.purchaseDefaults as Partial<ShippingPurchaseDefaults>)
        : undefined,
    },
  };
}

export type FedExShipmentRequestInput = Omit<FedExPurchaseInput, "purchaseDefaults"> & {
  purchaseDefaults: Partial<ShippingPurchaseDefaults> | undefined;
};

export function parseFedExShipmentRequest(
  payload: unknown
): ParseResult<FedExShipmentRequestInput> {
  const rateRequest = parseFedExRateRequest(payload);
  if (!rateRequest.ok) return rateRequest;
  const body = payload as Record<string, unknown>;
  if (typeof body.orderId !== "string" || !SAFE_ORDER_ID_PATTERN.test(body.orderId)) {
    return { ok: false, error: "A valid order id is required." };
  }
  if (typeof body.serviceType !== "string" || !body.serviceType.trim()) {
    return { ok: false, error: "Choose a FedEx service before purchasing." };
  }
  const quoted = Number(body.quotedNetCharge);

  if (body.accountId !== undefined && !(typeof body.accountId === "string" && ACCOUNT_ID_PATTERN.test(body.accountId))) {
    return { ok: false, error: "Choose a valid FedEx account." };
  }

  return {
    ok: true,
    value: {
      ...rateRequest.value,
      orderId: body.orderId,
      serviceType: body.serviceType,
      ...(typeof body.accountId === "string" ? { accountId: body.accountId } : {}),
      confirmRepurchase: body.confirmRepurchase === true,
      quotedNetCharge:
        body.quotedNetCharge !== null &&
        body.quotedNetCharge !== undefined &&
        Number.isFinite(quoted)
          ? quoted
          : null,
    },
  };
}

/** Purchase record as sent to the browser (without retained label bytes). */
export function publicPurchase(purchase: StoredPurchase): StoredPurchase {
  const { pendingLabelBase64: _labelBytes, ...rest } = purchase;
  return rest;
}
