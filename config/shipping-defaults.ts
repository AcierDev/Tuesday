import {
  ItemSizes,
  type ShippingAddressInput,
  type ShippingBoxPreset,
  type ShippingPurchaseDefaults,
  type ShippingSettings,
} from "@/typings/types";

// PLACEHOLDER: no ship-from phone is configured here on purpose. The owner
// must supply it (Settings → Ship From, or SHIP_FROM_PHONE on the server,
// which lib/fedex-api.ts uses as the FedEx contact-phone fallback).
export const DEFAULT_SHIP_FROM_PHONE = "";

export const DEFAULT_SHIP_FROM_ADDRESS: ShippingAddressInput = {
  name: "Everwood",
  company: "Everwood",
  phone: DEFAULT_SHIP_FROM_PHONE,
  email: "",
  line1: "1404 Blaine Ranch Street",
  line2: "",
  city: "Henderson",
  state: "NV",
  postalCode: "89012",
  country: "US",
  residential: false,
};

// FedEx enum values accepted for purchase defaults. Lists mirror the options
// offered by the settings editor and FedEx dialog (label stock also accepts
// the other FedEx PDF stock sizes so previously saved values stay valid).
export const FEDEX_PICKUP_TYPES = [
  "USE_SCHEDULED_PICKUP",
  "DROPOFF_AT_FEDEX_LOCATION",
  "CONTACT_FEDEX_TO_SCHEDULE",
] as const;

export const FEDEX_PACKAGING_TYPES = ["YOUR_PACKAGING"] as const;

export const FEDEX_LABEL_STOCK_TYPES = [
  "PAPER_4X6",
  "PAPER_4X675",
  "PAPER_4X8",
  "PAPER_4X9",
  "PAPER_7X475",
  "PAPER_85X11_BOTTOM_HALF_LABEL",
  "PAPER_85X11_TOP_HALF_LABEL",
  "PAPER_LETTER",
  "STOCK_4X6",
  "STOCK_4X675",
  "STOCK_4X675_LEADING_DOC_TAB",
  "STOCK_4X675_TRAILING_DOC_TAB",
  "STOCK_4X8",
  "STOCK_4X9",
  "STOCK_4X9_LEADING_DOC_TAB",
  "STOCK_4X9_TRAILING_DOC_TAB",
  "STOCK_4X85_TRAILING_DOC_TAB",
  "STOCK_4X105_TRAILING_DOC_TAB",
] as const;

export const FEDEX_SIGNATURE_OPTIONS = [
  "NO_SIGNATURE_REQUIRED",
  "SERVICE_DEFAULT",
  "INDIRECT",
  "DIRECT",
  "ADULT",
] as const;

export const SHIPPING_PURCHASE_DEFAULT_OPTIONS: Record<
  keyof ShippingPurchaseDefaults,
  readonly string[]
> = {
  pickupType: FEDEX_PICKUP_TYPES,
  packagingType: FEDEX_PACKAGING_TYPES,
  labelStockType: FEDEX_LABEL_STOCK_TYPES,
  signatureOption: FEDEX_SIGNATURE_OPTIONS,
};

export const SHIP_FROM_STRING_FIELDS = [
  "name",
  "company",
  "phone",
  "email",
  "line1",
  "line2",
  "city",
  "state",
  "postalCode",
  "country",
] as const satisfies readonly (keyof ShippingAddressInput)[];

const BOX_NUMERIC_FIELDS = ["length", "width", "height", "weight"] as const;

/** Field the presets were stored under before the boxPresetsBySize rename. */
export const LEGACY_BOX_PRESETS_FIELD = "packagePresetsBySize";

export const DEFAULT_SHIPPING_PURCHASE_DEFAULTS: ShippingPurchaseDefaults = {
  pickupType: "DROPOFF_AT_FEDEX_LOCATION",
  packagingType: "YOUR_PACKAGING",
  labelStockType: "PAPER_4X6",
  signatureOption: "NO_SIGNATURE_REQUIRED",
};

// Matches the "Standard sizes and packages" chart in the Everwood SOP manual
// (inches; pounds per box). The SOP chart also lists 32×12 (2 × 41×27×6 at
// 42 lb), which has no ItemSizes entry yet.
export const DEFAULT_BOX_PRESETS_BY_SIZE: Record<
  ItemSizes,
  ShippingBoxPreset[]
> = {
  [ItemSizes.Fourteen_By_Seven]: [
    { id: "pkg-1", label: "Main carton", length: 44, width: 21, height: 4, weight: 15 },
  ],
  [ItemSizes.Sixteen_By_Six]: [
    { id: "pkg-1", label: "Main carton", length: 56, width: 21, height: 4, weight: 21 },
  ],
  [ItemSizes.Sixteen_By_Ten]: [
    { id: "pkg-1", label: "Main carton", length: 37, width: 30, height: 6, weight: 35 },
  ],
  [ItemSizes.Twenty_By_Ten]: [
    { id: "pkg-1", label: "Main carton", length: 37, width: 34, height: 6, weight: 43 },
  ],
  [ItemSizes.TwentyFour_By_Ten]: [
    { id: "pkg-1", label: "Main carton", length: 41, width: 37, height: 6, weight: 52 },
  ],
  [ItemSizes.Twenty_By_Twelve]: [
    { id: "pkg-1", label: "Main carton", length: 41, width: 37, height: 6, weight: 52 },
  ],
  [ItemSizes.TwentyFour_By_Twelve]: [
    { id: "pkg-1", label: "Box 1", length: 41, width: 25, height: 6, weight: 31 },
    { id: "pkg-2", label: "Box 2", length: 41, width: 25, height: 6, weight: 31 },
  ],
  [ItemSizes.TwentyEight_By_Twelve]: [
    { id: "pkg-1", label: "Box 1", length: 41, width: 25, height: 6, weight: 36 },
    { id: "pkg-2", label: "Box 2", length: 41, width: 25, height: 6, weight: 36 },
  ],
  [ItemSizes.TwentyEight_By_Sixteen]: [
    { id: "pkg-1", label: "Box 1", length: 54, width: 25, height: 6, weight: 48 },
    { id: "pkg-2", label: "Box 2", length: 54, width: 25, height: 6, weight: 48 },
  ],
  [ItemSizes.ThirtyTwo_By_Sixteen]: [
    { id: "pkg-1", label: "Box 1", length: 54, width: 27, height: 6, weight: 53 },
    { id: "pkg-2", label: "Box 2", length: 54, width: 27, height: 6, weight: 53 },
  ],
  [ItemSizes.ThirtySix_By_Sixteen]: [
    { id: "pkg-1", label: "Box 1", length: 54, width: 25, height: 6, weight: 48 },
    { id: "pkg-2", label: "Box 2", length: 54, width: 25, height: 6, weight: 48 },
    { id: "pkg-3", label: "Box 3", length: 53, width: 32, height: 5, weight: 30 },
  ],
  [ItemSizes.Forty_By_Sixteen]: [
    { id: "pkg-1", label: "Box 1", length: 54, width: 25, height: 6, weight: 48 },
    { id: "pkg-2", label: "Box 2", length: 54, width: 25, height: 6, weight: 48 },
    { id: "pkg-3", label: "Box 3", length: 54, width: 25, height: 6, weight: 38 },
  ],
};

function cloneBoxPreset(
  preset: ShippingBoxPreset,
  index: number
): ShippingBoxPreset {
  return {
    ...preset,
    id: preset.id || `pkg-${index + 1}`,
  };
}

export function createDefaultShippingSettings(): ShippingSettings {
  return {
    _id: "shipping",
    boxPresetsBySize: Object.fromEntries(
      Object.entries(DEFAULT_BOX_PRESETS_BY_SIZE).map(([size, presets]) => [
        size,
        presets.map(cloneBoxPreset),
      ])
    ) as Record<ItemSizes, ShippingBoxPreset[]>,
    shipFrom: { ...DEFAULT_SHIP_FROM_ADDRESS },
    purchaseDefaults: { ...DEFAULT_SHIPPING_PURCHASE_DEFAULTS },
    updatedAt: Date.now(),
  };
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Shared sanitizer. Always returns usable settings (invalid values fall back
 * to defaults, unknown keys are dropped). When `errors` is passed, every
 * rejected value is reported so strict callers (the settings PUT) can 400.
 */
function sanitizeShippingSettings(
  input: unknown,
  errors?: string[]
): ShippingSettings {
  const report = (message: string) => errors?.push(message);
  const strict = Boolean(errors);
  const defaults = createDefaultShippingSettings();
  const source: UnknownRecord = isRecord(input) ? input : {};
  if (input != null && !isRecord(input)) report("Settings must be an object.");

  // Read either the new field or the legacy field so documents written before
  // the rename keep loading. Saves write only the new field.
  const rawPresets =
    source.boxPresetsBySize !== undefined
      ? source.boxPresetsBySize
      : source[LEGACY_BOX_PRESETS_FIELD];
  const presetsBySize: UnknownRecord = isRecord(rawPresets) ? rawPresets : {};
  if (rawPresets !== undefined && !isRecord(rawPresets)) {
    report("boxPresetsBySize must be an object keyed by item size.");
  }

  const boxPresetsBySize = { ...defaults.boxPresetsBySize };
  for (const size of Object.values(ItemSizes)) {
    const presets = sanitizeBoxPresets(size, presetsBySize[size], strict, report);
    if (presets) boxPresetsBySize[size] = presets;
  }

  return {
    _id: typeof source._id === "string" && source._id ? source._id : defaults._id,
    boxPresetsBySize,
    shipFrom: sanitizeShipFrom(source.shipFrom, defaults.shipFrom, report),
    purchaseDefaults: sanitizePurchaseDefaults(
      source.purchaseDefaults,
      defaults.purchaseDefaults,
      report
    ),
    updatedAt:
      typeof source.updatedAt === "number" && Number.isFinite(source.updatedAt)
        ? source.updatedAt
        : defaults.updatedAt,
  };
}

function sanitizeBoxPresets(
  size: ItemSizes,
  raw: unknown,
  strict: boolean,
  report: (message: string) => void
): ShippingBoxPreset[] | null {
  if (raw === undefined || raw === null) return null;
  if (!Array.isArray(raw)) {
    report(`${size}: box presets must be a list.`);
    return null;
  }
  if (raw.length === 0) {
    if (strict) report(`${size}: at least one box is required.`);
    return null;
  }

  const presets: ShippingBoxPreset[] = [];
  raw.forEach((entry, index) => {
    const boxName = `${size} box ${index + 1}`;
    if (!isRecord(entry)) {
      report(`${boxName} must be an object.`);
      return;
    }
    const numbers = {} as Record<(typeof BOX_NUMERIC_FIELDS)[number], number>;
    for (const field of BOX_NUMERIC_FIELDS) {
      const value = typeof entry[field] === "string" && entry[field] !== ""
        ? Number(entry[field])
        : entry[field];
      const valid = typeof value === "number" && Number.isFinite(value);
      // Stored drafts may hold 0 while a box is being filled in; keep them
      // leniently, but a save must have every measurement above zero.
      if (!valid || value < 0 || (strict && value <= 0)) {
        report(`${boxName}: ${field} must be a number greater than 0.`);
      }
      numbers[field] = valid && value >= 0 ? value : 0;
    }
    if (entry.label !== undefined && typeof entry.label !== "string") {
      report(`${boxName}: label must be text.`);
    }
    presets.push({
      id:
        typeof entry.id === "string" && entry.id ? entry.id : `pkg-${index + 1}`,
      ...(typeof entry.label === "string" ? { label: entry.label } : {}),
      ...numbers,
    });
  });

  return presets.length ? presets : null;
}

function sanitizeShipFrom(
  raw: unknown,
  defaults: ShippingAddressInput,
  report: (message: string) => void
): ShippingAddressInput {
  const shipFrom: ShippingAddressInput = { ...defaults };
  if (raw === undefined || raw === null) return shipFrom;
  if (!isRecord(raw)) {
    report("shipFrom must be an object.");
    return shipFrom;
  }

  for (const field of SHIP_FROM_STRING_FIELDS) {
    const value = raw[field];
    if (value === undefined) continue;
    if (typeof value === "string") {
      shipFrom[field] = value;
    } else {
      report(`shipFrom.${field} must be text.`);
    }
  }
  if (raw.residential !== undefined) {
    if (typeof raw.residential === "boolean") {
      shipFrom.residential = raw.residential;
    } else {
      report("shipFrom.residential must be true or false.");
    }
  }
  return shipFrom;
}

function sanitizePurchaseDefaults(
  raw: unknown,
  defaults: ShippingPurchaseDefaults,
  report: (message: string) => void
): ShippingPurchaseDefaults {
  const purchaseDefaults: ShippingPurchaseDefaults = { ...defaults };
  if (raw === undefined || raw === null) return purchaseDefaults;
  if (!isRecord(raw)) {
    report("purchaseDefaults must be an object.");
    return purchaseDefaults;
  }

  for (const field of Object.keys(
    SHIPPING_PURCHASE_DEFAULT_OPTIONS
  ) as (keyof ShippingPurchaseDefaults)[]) {
    const value = raw[field];
    if (value === undefined) continue;
    if (
      typeof value === "string" &&
      SHIPPING_PURCHASE_DEFAULT_OPTIONS[field].includes(value)
    ) {
      purchaseDefaults[field] = value;
    } else {
      report(
        `purchaseDefaults.${field} must be one of ${SHIPPING_PURCHASE_DEFAULT_OPTIONS[
          field
        ].join(", ")}.`
      );
    }
  }
  return purchaseDefaults;
}

/** Lenient: used for stored documents and request fragments. */
export function normalizeShippingSettings(
  input?: Partial<ShippingSettings> | null
): ShippingSettings {
  return sanitizeShippingSettings(input);
}

export type ShippingSettingsValidation =
  | { ok: true; settings: ShippingSettings }
  | { ok: false; errors: string[] };

/** Strict: rejects anything the lenient normalizer would have to repair. */
export function validateShippingSettingsInput(
  input: unknown
): ShippingSettingsValidation {
  const errors: string[] = [];
  if (!isRecord(input)) {
    return { ok: false, errors: ["Settings must be an object."] };
  }
  const settings = sanitizeShippingSettings(input, errors);
  return errors.length ? { ok: false, errors } : { ok: true, settings };
}

/** Stable JSON: sorted keys, undefined dropped, array order kept. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry ?? null)).join(",")}]`;
  }
  if (isRecord(value)) {
    const entries = Object.keys(value)
      .filter((key) => value[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

const SETTINGS_COMPARE_IGNORED_FIELDS = [
  "_id",
  "updatedAt",
  LEGACY_BOX_PRESETS_FIELD,
];

/**
 * True when a stored settings document already matches its normalized form,
 * ignoring _id, updatedAt, key order and the legacy preset field name (a doc
 * that only has the legacy field is compared through it).
 */
export function storedShippingSettingsMatch(
  stored: unknown,
  normalized: ShippingSettings
): boolean {
  if (!isRecord(stored)) return false;
  const comparableStored: UnknownRecord = { ...stored };
  if (comparableStored.boxPresetsBySize === undefined) {
    comparableStored.boxPresetsBySize = stored[LEGACY_BOX_PRESETS_FIELD];
  }
  const comparableNormalized: UnknownRecord = { ...normalized };
  for (const field of SETTINGS_COMPARE_IGNORED_FIELDS) {
    delete comparableStored[field];
    delete comparableNormalized[field];
  }
  return canonicalJson(comparableStored) === canonicalJson(comparableNormalized);
}
