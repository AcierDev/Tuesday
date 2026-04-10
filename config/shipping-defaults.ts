import {
  ItemSizes,
  type ShippingAddressInput,
  type ShippingPackagePreset,
  type ShippingPurchaseDefaults,
  type ShippingSettings,
} from "@/typings/types";

export const DEFAULT_SHIP_FROM_ADDRESS: ShippingAddressInput = {
  name: "Everwood",
  company: "Everwood",
  phone: "",
  email: "",
  line1: "1111 Mary Crest Rd",
  line2: "",
  city: "Henderson",
  state: "NV",
  postalCode: "89074",
  country: "US",
  residential: false,
};

export const DEFAULT_SHIPPING_PURCHASE_DEFAULTS: ShippingPurchaseDefaults = {
  pickupType: "DROPOFF_AT_FEDEX_LOCATION",
  packagingType: "YOUR_PACKAGING",
  labelStockType: "PAPER_4X6",
  signatureOption: "NO_SIGNATURE_REQUIRED",
};

export const DEFAULT_PACKAGE_PRESETS_BY_SIZE: Record<
  ItemSizes,
  ShippingPackagePreset[]
> = {
  [ItemSizes.Fourteen_By_Seven]: [
    { id: "pkg-1", label: "Main carton", length: 44, width: 22, height: 4, weight: 12 },
  ],
  [ItemSizes.Sixteen_By_Six]: [
    { id: "pkg-1", label: "Main carton", length: 54, width: 22, height: 4, weight: 15 },
  ],
  [ItemSizes.Sixteen_By_Ten]: [
    { id: "pkg-1", label: "Main carton", length: 39, width: 35, height: 7, weight: 40 },
  ],
  [ItemSizes.Twenty_By_Ten]: [
    { id: "pkg-1", label: "Main carton", length: 39, width: 35, height: 7, weight: 50 },
  ],
  [ItemSizes.TwentyFour_By_Ten]: [
    { id: "pkg-1", label: "Main carton", length: 41.5, width: 37, height: 6, weight: 65 },
  ],
  [ItemSizes.Twenty_By_Twelve]: [
    { id: "pkg-1", label: "Main carton", length: 41.5, width: 37, height: 6, weight: 65 },
  ],
  [ItemSizes.TwentyFour_By_Twelve]: [
    { id: "pkg-1", label: "Main carton", length: 48, width: 38, height: 6, weight: 78 },
  ],
  [ItemSizes.TwentyEight_By_Twelve]: [
    { id: "pkg-1", label: "Panel box 1", length: 39, width: 35, height: 7, weight: 50 },
    { id: "pkg-2", label: "Panel box 2", length: 41, width: 32, height: 4, weight: 25 },
  ],
  [ItemSizes.TwentyEight_By_Sixteen]: [
    { id: "pkg-1", label: "Panel box 1", length: 54, width: 32, height: 5, weight: 35 },
    { id: "pkg-2", label: "Panel box 2", length: 54, width: 32, height: 5, weight: 35 },
    { id: "pkg-3", label: "Panel box 3", length: 54, width: 32, height: 5, weight: 35 },
  ],
  [ItemSizes.ThirtyTwo_By_Sixteen]: [
    { id: "pkg-1", label: "Panel box 1", length: 54, width: 32, height: 5, weight: 35 },
    { id: "pkg-2", label: "Panel box 2", length: 54, width: 32, height: 5, weight: 35 },
    { id: "pkg-3", label: "Hardware carton", length: 54, width: 26, height: 7, weight: 55 },
  ],
  [ItemSizes.ThirtySix_By_Sixteen]: [
    { id: "pkg-1", label: "Panel box 1", length: 54, width: 32, height: 5, weight: 35 },
    { id: "pkg-2", label: "Panel box 2", length: 54, width: 32, height: 5, weight: 35 },
    { id: "pkg-3", label: "Panel box 3", length: 54, width: 32, height: 5, weight: 35 },
    { id: "pkg-4", label: "Panel box 4", length: 54, width: 32, height: 5, weight: 35 },
  ],
};

function clonePackagePreset(
  preset: ShippingPackagePreset,
  index: number
): ShippingPackagePreset {
  return {
    ...preset,
    id: preset.id || `pkg-${index + 1}`,
  };
}

export function createDefaultShippingSettings(): ShippingSettings {
  return {
    _id: "shipping",
    packagePresetsBySize: Object.fromEntries(
      Object.entries(DEFAULT_PACKAGE_PRESETS_BY_SIZE).map(([size, presets]) => [
        size,
        presets.map(clonePackagePreset),
      ])
    ) as Record<ItemSizes, ShippingPackagePreset[]>,
    shipFrom: { ...DEFAULT_SHIP_FROM_ADDRESS },
    purchaseDefaults: { ...DEFAULT_SHIPPING_PURCHASE_DEFAULTS },
    updatedAt: Date.now(),
  };
}

export function normalizeShippingSettings(
  input?: Partial<ShippingSettings> | null
): ShippingSettings {
  const defaults = createDefaultShippingSettings();
  const packagePresetsBySize = { ...defaults.packagePresetsBySize };

  for (const size of Object.values(ItemSizes)) {
    const existingPresets = input?.packagePresetsBySize?.[size];
    if (existingPresets?.length) {
      packagePresetsBySize[size] = existingPresets.map(clonePackagePreset);
    }
  }

  return {
    _id: input?._id || defaults._id,
    packagePresetsBySize,
    shipFrom: {
      ...defaults.shipFrom,
      ...input?.shipFrom,
    },
    purchaseDefaults: {
      ...defaults.purchaseDefaults,
      ...input?.purchaseDefaults,
    },
    updatedAt: input?.updatedAt || defaults.updatedAt,
  };
}
