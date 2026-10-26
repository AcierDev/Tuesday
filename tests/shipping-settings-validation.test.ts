import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  createDefaultShippingSettings,
  DEFAULT_BOX_PRESETS_BY_SIZE,
  DEFAULT_SHIP_FROM_ADDRESS,
  normalizeShippingSettings,
  storedShippingSettingsMatch,
  validateShippingSettingsInput,
} from "../config/shipping-defaults";
import type {
  getShippingSettings as GetShippingSettings,
  saveShippingSettings as SaveShippingSettings,
} from "../lib/shipping-settings";
import { ItemSizes, type ShippingSettings } from "../typings/types";

const SIZE = ItemSizes.Sixteen_By_Six;
const STORED_UPDATED_AT = 1_700_000_000_000;

function validSettings(): ShippingSettings {
  return { ...createDefaultShippingSettings(), updatedAt: STORED_UPDATED_AT };
}

function errorsFor(input: unknown): string[] {
  const result = validateShippingSettingsInput(input);
  return result.ok ? [] : result.errors;
}

test("valid settings pass and unknown keys are dropped", () => {
  const input = {
    ...validSettings(),
    hacked: true,
    shipFrom: { ...DEFAULT_SHIP_FROM_ADDRESS, injected: "x" },
    purchaseDefaults: {
      ...validSettings().purchaseDefaults,
      labelStockType: "PAPER_LETTER",
      extra: 1,
    },
  };
  const result = validateShippingSettingsInput(input);
  assert.ok(result.ok);
  assert.equal("hacked" in result.settings, false);
  assert.equal("injected" in result.settings.shipFrom, false);
  assert.equal("extra" in result.settings.purchaseDefaults, false);
  assert.equal(result.settings.purchaseDefaults.labelStockType, "PAPER_LETTER");
});

test("strict validation rejects bad presets, enums and address types", () => {
  assert.notEqual(errorsFor(null).length, 0);
  assert.notEqual(errorsFor([]).length, 0);
  assert.notEqual(
    errorsFor({ boxPresetsBySize: { [SIZE]: [null] } }).length,
    0,
    "[null] presets"
  );
  assert.notEqual(errorsFor({ boxPresetsBySize: { [SIZE]: [] } }).length, 0);
  assert.notEqual(errorsFor({ boxPresetsBySize: { [SIZE]: "box" } }).length, 0);
  for (const bad of [0, -1, Number.NaN, "abc", null]) {
    const errors = errorsFor({
      boxPresetsBySize: {
        [SIZE]: [{ id: "a", length: bad, width: 1, height: 1, weight: 1 }],
      },
    });
    assert.notEqual(errors.length, 0, `length ${String(bad)}`);
  }
  assert.notEqual(
    errorsFor({ purchaseDefaults: { signatureOption: "FREE_MONEY" } }).length,
    0
  );
  assert.notEqual(errorsFor({ shipFrom: { line1: 12 } }).length, 0);
  assert.notEqual(errorsFor({ shipFrom: { residential: "yes" } }).length, 0);
  assert.notEqual(errorsFor({ shipFrom: "Henderson" }).length, 0);
});

test("lenient normalization repairs instead of throwing", () => {
  const normalized = normalizeShippingSettings({
    boxPresetsBySize: {
      [SIZE]: [null, { id: "", length: "12", width: 0, height: 4, weight: 5 }],
      [ItemSizes.Fourteen_By_Seven]: [],
    },
    purchaseDefaults: { pickupType: "TELEPORT" },
    shipFrom: { city: 7 },
  } as unknown as ShippingSettings);

  assert.deepEqual(normalized.boxPresetsBySize[SIZE], [
    { id: "pkg-2", length: 12, width: 0, height: 4, weight: 5 },
  ]);
  assert.deepEqual(
    normalized.boxPresetsBySize[ItemSizes.Fourteen_By_Seven],
    DEFAULT_BOX_PRESETS_BY_SIZE[ItemSizes.Fourteen_By_Seven]
  );
  assert.equal(
    normalized.purchaseDefaults.pickupType,
    createDefaultShippingSettings().purchaseDefaults.pickupType
  );
  assert.equal(normalized.shipFrom.city, DEFAULT_SHIP_FROM_ADDRESS.city);
});

test("default box presets and ship-from address follow the SOP chart", () => {
  assert.deepEqual(DEFAULT_BOX_PRESETS_BY_SIZE[ItemSizes.Sixteen_By_Six], [
    { id: "pkg-1", label: "Main carton", length: 56, width: 21, height: 4, weight: 21 },
  ]);
  assert.equal(DEFAULT_BOX_PRESETS_BY_SIZE[ItemSizes.ThirtySix_By_Sixteen].length, 3);
  assert.equal(DEFAULT_SHIP_FROM_ADDRESS.line1, "1404 Blaine Ranch Street");
  assert.equal(DEFAULT_SHIP_FROM_ADDRESS.postalCode, "89012");
  assert.equal(DEFAULT_SHIP_FROM_ADDRESS.phone, "");
});

test("stored-vs-normalized compare ignores legacy field, order and updatedAt", () => {
  const normalized = normalizeShippingSettings(validSettings());
  const { boxPresetsBySize, ...rest } = normalized;
  const legacyOnly = {
    ...rest,
    updatedAt: STORED_UPDATED_AT - 1,
    packagePresetsBySize: boxPresetsBySize,
  };
  assert.equal(storedShippingSettingsMatch(legacyOnly, normalizeShippingSettings(legacyOnly)), true);

  const reordered = Object.fromEntries(Object.entries(normalized).reverse());
  assert.equal(storedShippingSettingsMatch(reordered, normalized), true);

  const changed = {
    ...normalized,
    shipFrom: { ...normalized.shipFrom, unknownField: "x" },
  };
  assert.equal(storedShippingSettingsMatch(changed, normalized), false);
  assert.equal(storedShippingSettingsMatch(null, normalized), false);
});

// ── lib/shipping-settings with an in-memory collection (no Mongo) ──────────

type UpdateCall = { filter: unknown; update: Record<string, unknown> };
let storedDoc: Record<string, unknown> | null = null;
const updates: UpdateCall[] = [];
let getShippingSettings: typeof GetShippingSettings;
let saveShippingSettings: typeof SaveShippingSettings;
const originalEnv = { ...process.env };

before(async () => {
  process.env.MONGODB_URI = "mongodb://stub.invalid/never-used";
  (process.env as Record<string, string>).NODE_ENV = "development";
  const collection = {
    findOne: async () => storedDoc,
    updateOne: async (filter: unknown, update: Record<string, unknown>) => {
      updates.push({ filter, update });
      return { acknowledged: true };
    },
  };
  (globalThis as { _mongoClientPromise?: Promise<unknown> })._mongoClientPromise =
    Promise.resolve({ db: () => ({ collection: () => collection }) });
  ({ getShippingSettings, saveShippingSettings } = await import(
    "../lib/shipping-settings"
  ));
});

after(() => {
  process.env = originalEnv;
  delete (globalThis as { _mongoClientPromise?: Promise<unknown> })
    ._mongoClientPromise;
});

test("GET does not rewrite a doc that only carries the legacy preset field", async () => {
  const { boxPresetsBySize, ...rest } = normalizeShippingSettings(validSettings());
  storedDoc = { ...rest, _id: "shipping", packagePresetsBySize: boxPresetsBySize };
  updates.length = 0;

  const settings = await getShippingSettings();

  assert.equal(updates.length, 0);
  assert.equal(settings.updatedAt, STORED_UPDATED_AT);
  assert.deepEqual(settings.boxPresetsBySize, boxPresetsBySize);
});

test("GET still seeds a missing document", async () => {
  storedDoc = null;
  updates.length = 0;
  await getShippingSettings();
  assert.equal(updates.length, 1);
});

test("saving strips the legacy preset field", async () => {
  updates.length = 0;
  await saveShippingSettings(validSettings());
  assert.equal(updates.length, 1);
  assert.deepEqual(updates[0]?.update.$unset, { packagePresetsBySize: "" });
});
