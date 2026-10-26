import { getDb } from "@/app/api/db/connect";
import {
  LEGACY_BOX_PRESETS_FIELD,
  normalizeShippingSettings,
  storedShippingSettingsMatch,
} from "@/config/shipping-defaults";
import { type ShippingSettings } from "@/typings/types";

const SETTINGS_COLLECTION = `settings-${process.env.NEXT_PUBLIC_MODE}`;
const SHIPPING_SETTINGS_ID = "shipping";
type ShippingSettingsDocument = ShippingSettings & {
  _id: string;
  [LEGACY_BOX_PRESETS_FIELD]?: unknown;
};

export async function getShippingSettings(): Promise<ShippingSettings> {
  const db = await getDb();
  const collection = db.collection<ShippingSettingsDocument>(SETTINGS_COLLECTION);
  const existing = await collection.findOne({ _id: SHIPPING_SETTINGS_ID });
  const normalized = normalizeShippingSettings(existing);

  // Reads only write when the document is missing or genuinely needs repair.
  // A legacy preset field name, key order or updatedAt alone never triggers a
  // write; the legacy field is dropped on the next real save instead.
  if (existing && storedShippingSettingsMatch(existing, normalized)) {
    return normalized;
  }

  const { _id: _normalizedId, ...normalizedWithoutId } = normalized;
  const updatedAt = Date.now();
  await collection.updateOne(
    { _id: SHIPPING_SETTINGS_ID },
    { $set: { ...normalizedWithoutId, updatedAt } },
    { upsert: true }
  );

  return { ...normalized, updatedAt };
}

export async function saveShippingSettings(
  settings: ShippingSettings
): Promise<ShippingSettings> {
  const normalized = normalizeShippingSettings({
    ...settings,
    _id: SHIPPING_SETTINGS_ID,
    updatedAt: Date.now(),
  });
  const { _id: _normalizedId, ...normalizedWithoutId } = normalized;

  const db = await getDb();
  const collection = db.collection<ShippingSettingsDocument>(SETTINGS_COLLECTION);
  await collection.updateOne(
    { _id: SHIPPING_SETTINGS_ID },
    {
      $set: normalizedWithoutId,
      $unset: { [LEGACY_BOX_PRESETS_FIELD]: "" },
    },
    { upsert: true }
  );

  return normalized;
}
