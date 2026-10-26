import type { ShippingAddressInput, ShippingDetails } from "@/typings/types";

// Browser-safe helpers for the FedEx buy-label dialog.

/** FedEx rejects or truncates street lines longer than this. */
export const FEDEX_STREET_LINE_MAX_LENGTH = 35;
/** Charges within a cent of the quote are treated as equal. */
export const PRICE_CHANGE_TOLERANCE = 0.01;

const PO_BOX_PATTERN = /\b(?:p\.?\s*o\.?\s*box|post\s+office\s+box)\b/i;
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const HEX_RADIX = 16;

export type RecipientAddress = ShippingAddressInput & { line3?: string };

function fnv1a(text: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash.toString(HEX_RADIX);
}

/**
 * Identifies the order address + shipping settings a saved draft was built
 * from. A saved draft whose hash differs is stale and must not override them.
 */
export function draftSourceHash(input: {
  shippingDetails: ShippingDetails | undefined;
  customerName: string | undefined;
  settingsUpdatedAt: number | undefined;
}): string {
  return fnv1a(
    JSON.stringify([
      input.shippingDetails ?? null,
      input.customerName ?? null,
      input.settingsUpdatedAt ?? null,
    ])
  );
}

export function recipientAddressWarnings(address: RecipientAddress): string[] {
  const lines = [address.line1, address.line2, address.line3]
    .map((line) => line?.trim() ?? "")
    .filter(Boolean);
  const warnings: string[] = [];
  if (lines.some((line) => PO_BOX_PATTERN.test(line))) {
    warnings.push("FedEx can't deliver to a PO Box. Get a street address from the buyer.");
  }
  lines.forEach((line, index) => {
    if (line.length > FEDEX_STREET_LINE_MAX_LENGTH) {
      warnings.push(
        `Address line ${index + 1} is ${line.length} characters; FedEx allows ${FEDEX_STREET_LINE_MAX_LENGTH}. Move the rest to the next line.`
      );
    }
  });
  return warnings;
}

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

/** Warning when FedEx billed something other than the quote that was shown. */
export function chargeMismatchWarning(
  quoted: number | null | undefined,
  charged: number | null | undefined,
  currency = "USD"
): string | null {
  if (charged === null || charged === undefined) {
    return "FedEx did not report the final charge. Check the FedEx invoice for this label.";
  }
  if (quoted === null || quoted === undefined) return null;
  if (Math.abs(charged - quoted) <= PRICE_CHANGE_TOLERANCE) return null;
  return `FedEx charged ${formatMoney(charged, currency)}, but the quote was ${formatMoney(quoted, currency)}.`;
}
