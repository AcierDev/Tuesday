import { ETSY_CONFIG, ETSY_ORDER_IMPORT } from "@/config/etsy";
import { ItemStatus, type Item, type ShippingDetails } from "@/typings/types";

// Pure Etsy receipt → dashboard order mapping (one order per quantity unit),
// mirroring the Etsy Order Manager extension's parsing.

export type EtsyVariation = { formatted_name?: string; formatted_value?: string };

export type EtsyTransaction = {
  transaction_id: number;
  title?: string;
  quantity?: number;
  is_digital?: boolean;
  expected_ship_date?: number | null;
  variations?: EtsyVariation[];
};

export type EtsyReceipt = {
  receipt_id: number;
  status?: string;
  is_paid?: boolean;
  is_shipped?: boolean;
  name?: string;
  first_line?: string | null;
  second_line?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  country_iso?: string | null;
  message_from_buyer?: string | null;
  transactions?: EtsyTransaction[];
};

const SECONDS_TO_MS = 1000;
const FIRST_UNIT = 1;
const IMPORTABLE_STATUSES = new Set(["paid", "open", "completed"]);
const HTML_ENTITIES: Record<string, string> = { "&quot;": '"', "&#39;": "'", "&apos;": "'", "&amp;": "&", "&lt;": "<", "&gt;": ">" };

export const decodeEtsyText = (text: string | null | undefined) =>
  (text ?? "").replace(/&(?:quot|#39|apos|amp|lt|gt);/g, (entity) => HTML_ENTITIES[entity] ?? entity).trim();

const LEGACY_TITLE = /Geometric\s+((?:Striped|Tiled)\s+)?Wood\s+(?:Wall\s+)?Art\s+-\s+(.+?)(?:\n|Transaction ID|Qty|\t|$)/i;
const CURRENT_TITLE = /^\s*(.+?)\s*\|\s*Geometric\s+((?:Striped|Tiled)\s+)?Wood\s+(?:Wall\s+)?Art(?=\W|$)/i;

/** "Carbon | Geometric Striped Wood Wall Art" → "Striped Carbon"; "" when the title has no design. */
export function parseEtsyDesign(title: string): string {
  const text = decodeEtsyText(title);
  const legacy = text.match(LEGACY_TITLE);
  const current = legacy ? null : text.match(CURRENT_TITLE);
  const variant = (legacy ? legacy[1] : current?.[2])?.trim();
  const rawName = (legacy ? legacy[2] : current?.[1])?.trim();
  if (!rawName) return "";
  const name = ETSY_ORDER_IMPORT.designNameMap[rawName] ?? rawName;
  return variant ? `${variant} ${name}` : name;
}

const INCH_SIZE = /(\d+)"\s*x\s*(\d+)"/i;
const INCH_BY_FEET_SIZE = /(\d+)"\s*x\s*(\d+)\s*feet/i;

/** Etsy's Size option ('30" x 6 feet') → board size; "Contact Akiva" when unknown. */
export function parseEtsySize(value: string): string {
  const text = decodeEtsyText(value);
  const inches = text.match(INCH_SIZE);
  const feet = inches ? null : text.match(INCH_BY_FEET_SIZE);
  if (!inches && !feet) return ETSY_ORDER_IMPORT.unparsedSize;
  const width = Number((inches ?? feet)?.[1]);
  const length = inches ? Number(inches[2]) : Number(feet?.[2]) * ETSY_ORDER_IMPORT.inchesPerFoot;
  return ETSY_ORDER_IMPORT.sizeByInches[width]?.[length] ?? ETSY_ORDER_IMPORT.unparsedSize;
}

const variationValue = (transaction: EtsyTransaction, name: RegExp) =>
  transaction.variations?.find((variation) => name.test(decodeEtsyText(variation.formatted_name)))?.formatted_value;

/** Capitalizes each word, leaving parenthesized text as typed (extension behavior). */
export function capitalizeCustomerName(name: string): string {
  return name.replace(/\([^)]*\)|[^()]+/g, (segment) =>
    segment.startsWith("(") ? segment : segment.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1)));
}

function companyPrefix(design: string): string {
  const haystack = design.toLowerCase();
  const match = Object.entries(ETSY_ORDER_IMPORT.designCompanyPrefixes).find(([trigger]) => haystack.includes(trigger));
  return match?.[1] ?? "";
}

const shipByFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: ETSY_CONFIG.shopTimeZone, year: "numeric", month: "2-digit", day: "2-digit",
});

/** Etsy's expected ship date (epoch seconds) as the shop's calendar day, YYYY-MM-DD. */
export function shipByDate(epochSeconds: number | null | undefined): string {
  return typeof epochSeconds === "number" && epochSeconds > 0
    ? shipByFormatter.format(new Date(epochSeconds * SECONDS_TO_MS))
    : "";
}

function receiptShippingDetails(receipt: EtsyReceipt): Partial<ShippingDetails> | undefined {
  const fields: [keyof ShippingDetails, string | null | undefined][] = [
    ["name", receipt.name], ["street1", receipt.first_line], ["street2", receipt.second_line],
    ["city", receipt.city], ["state", receipt.state], ["postalCode", receipt.zip],
    ["country", receipt.country_iso?.toUpperCase()],
  ];
  const details = Object.fromEntries(
    fields.map(([field, value]) => [field, decodeEtsyText(value)]).filter(([, value]) => value)
  ) as Partial<ShippingDetails>;
  return details.street1 ? details : undefined;
}

/** Paid, unshipped, not canceled or refunded. */
export function isImportableReceipt(receipt: EtsyReceipt): boolean {
  return receipt.is_paid !== false && receipt.is_shipped !== true
    && IMPORTABLE_STATUSES.has((receipt.status ?? "paid").toLowerCase());
}

/** One new order per physical unit on the receipt, linked by receipt/transaction/unit. */
export function receiptToOrders(receipt: EtsyReceipt, now: number, createId: () => string): Item[] {
  const units = (receipt.transactions ?? [])
    .filter((transaction) => !transaction.is_digital)
    .flatMap((transaction) =>
      Array.from({ length: Math.max(FIRST_UNIT, transaction.quantity ?? FIRST_UNIT) }, (_, index) => ({
        transaction, quantityIndex: index + FIRST_UNIT,
      })));
  const shippingDetails = receiptShippingDetails(receipt);
  const buyerMessage = decodeEtsyText(receipt.message_from_buyer);
  const customer = capitalizeCustomerName(decodeEtsyText(receipt.name));

  return units.map(({ transaction, quantityIndex }, index) => {
    const design = parseEtsyDesign(transaction.title ?? "");
    const sizeOption = variationValue(transaction, ETSY_ORDER_IMPORT.sizeVariationName);
    const orientation = decodeEtsyText(variationValue(transaction, ETSY_ORDER_IMPORT.orientationVariationName));
    const suffix = units.length > FIRST_UNIT ? ` (${index + FIRST_UNIT}/${units.length})` : "";
    return {
      id: createId(),
      status: ItemStatus.New,
      createdAt: now,
      visible: true,
      deleted: false,
      isScheduled: false,
      index: 0,
      customerName: `${companyPrefix(design)}${customer}${suffix}`,
      design,
      size: sizeOption ? parseEtsySize(sizeOption) : "",
      dueDate: shipByDate(transaction.expected_ship_date),
      painted: "",
      backboard: "",
      glued: "",
      packaging: "",
      boxes: "",
      notes: buyerMessage ? `Etsy note: ${buyerMessage}` : "",
      labels: "",
      tags: {
        isVertical: ETSY_ORDER_IMPORT.verticalValue.test(orientation),
        ...(buyerMessage ? { hasCustomerMessage: true } : {}),
      },
      ...(shippingDetails ? { shippingDetails: shippingDetails as ShippingDetails } : {}),
      etsyOrder: {
        receiptId: String(receipt.receipt_id),
        transactionId: String(transaction.transaction_id),
        quantityIndex,
      },
    };
  });
}

export function etsyTrackingBody(trackingNumber: string) {
  return { tracking_code: trackingNumber, carrier_name: ETSY_CONFIG.trackingCarrierName, send_bcc: false };
}
