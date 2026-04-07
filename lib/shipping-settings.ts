import { getDb } from "@/app/api/db/connect";
import { normalizeShippingSettings } from "@/config/shipping-defaults";
import { type ShippingSettings } from "@/typings/types";

const SETTINGS_COLLECTION = `settings-${process.env.NEXT_PUBLIC_MODE}`;
const SHIPPING_SETTINGS_ID = "shipping";
type ShippingSettingsDocument = ShippingSettings & { _id: string };

export async function getShippingSettings(): Promise<ShippingSettings> {
  const db = await getDb();
  const collection = db.collection<ShippingSettingsDocument>(SETTINGS_COLLECTION);
  const existing = await collection.findOne({ _id: SHIPPING_SETTINGS_ID });
  const normalized = normalizeShippingSettings(existing);
  const { _id: _normalizedId, ...normalizedWithoutId } = normalized;

  if (!existing || JSON.stringify(existing) !== JSON.stringify(normalized)) {
    await collection.updateOne(
      { _id: SHIPPING_SETTINGS_ID },
      {
        $set: {
          ...normalizedWithoutId,
          updatedAt: Date.now(),
        },
      },
      { upsert: true }
    );
  }

  return normalized;
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
    },
    { upsert: true }
  );

  return normalized;
}
