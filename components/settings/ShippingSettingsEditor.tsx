"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Truck, Undo2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  createDefaultShippingSettings,
  normalizeShippingSettings,
} from "@/config/shipping-defaults";
import { useShippingSettingsStore } from "@/stores/useShippingSettingsStore";
import {
  ItemSizes,
  type ShippingAddressInput,
  type ShippingPackagePreset,
  type ShippingSettings,
} from "@/typings/types";
import {
  formatPackageNumberForInput,
  parsePackageNumericInput,
} from "@/utils/shipping-package-input";

const signatureOptions = [
  { value: "NO_SIGNATURE_REQUIRED", label: "No signature" },
  { value: "SERVICE_DEFAULT", label: "Service default" },
  { value: "DIRECT", label: "Direct signature" },
  { value: "ADULT", label: "Adult signature" },
];

const pickupTypeOptions = [
  { value: "USE_SCHEDULED_PICKUP", label: "Scheduled pickup" },
  { value: "DROPOFF_AT_FEDEX_LOCATION", label: "Drop off" },
];

const labelStockOptions = [
  { value: "PAPER_4X6", label: "4 x 6" },
  { value: "PAPER_4X675", label: "4 x 6.75" },
  { value: "PAPER_LETTER", label: "Letter" },
];

const packagingTypeOptions = [
  { value: "YOUR_PACKAGING", label: "Your packaging" },
];

/** Match orders page + FedEx dialog controls */
const settingsInputClassName =
  "border-gray-200 bg-white dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400";

/** Wide enough for sidebar layout; allow two-line labels if needed */
const settingsSelectTriggerClassName =
  "min-w-0 w-full border-gray-200 bg-white text-left dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400 [&>span]:line-clamp-2 [&>span]:whitespace-normal";

function formatItemSizeTitle(size: string) {
  return size.replace(/\s+x\s+/i, " × ");
}

function createPackagePreset(index: number): ShippingPackagePreset {
  return {
    id: `pkg-${Date.now()}-${index}`,
    label: "",
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
  };
}

function isDirty(a: ShippingSettings | null, b: ShippingSettings | null) {
  if (!a || !b) {
    return false;
  }

  return JSON.stringify(a) !== JSON.stringify(b);
}

export function ShippingSettingsEditor() {
  const { settings, isLoading, isSaving, error, fetchSettings, saveSettings } =
    useShippingSettingsStore();
  const [draft, setDraft] = useState<ShippingSettings | null>(null);

  useEffect(() => {
    fetchSettings().catch(() => undefined);
  }, [fetchSettings]);

  useEffect(() => {
    if (settings) {
      setDraft(normalizeShippingSettings(settings));
    }
  }, [settings]);

  const dirty = useMemo(() => isDirty(draft, settings), [draft, settings]);

  const updateShipFrom = (field: keyof ShippingAddressInput, value: string | boolean) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            shipFrom: {
              ...current.shipFrom,
              [field]: value,
            },
          }
        : current
    );
  };

  const updatePurchaseDefault = (field: keyof ShippingSettings["purchaseDefaults"], value: string) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            purchaseDefaults: {
              ...current.purchaseDefaults,
              [field]: value,
            },
          }
        : current
    );
  };

  const updatePreset = (
    size: ItemSizes,
    presetId: string,
    field: keyof ShippingPackagePreset,
    value: string
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        packagePresetsBySize: {
          ...current.packagePresetsBySize,
          [size]: current.packagePresetsBySize[size].map((preset) =>
            preset.id === presetId
              ? {
                  ...preset,
                  [field]:
                    field === "label"
                      ? value
                      : parsePackageNumericInput(value),
                }
              : preset
          ),
        },
      };
    });
  };

  const addPreset = (size: ItemSizes) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        packagePresetsBySize: {
          ...current.packagePresetsBySize,
          [size]: [
            ...current.packagePresetsBySize[size],
            createPackagePreset(current.packagePresetsBySize[size].length + 1),
          ],
        },
      };
    });
  };

  const removePreset = (size: ItemSizes, presetId: string) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const nextPresets = current.packagePresetsBySize[size].filter(
        (preset) => preset.id !== presetId
      );

      return {
        ...current,
        packagePresetsBySize: {
          ...current.packagePresetsBySize,
          [size]: nextPresets.length ? nextPresets : [createPackagePreset(1)],
        },
      };
    });
  };

  const handleReset = () => {
    setDraft(settings ? normalizeShippingSettings(settings) : createDefaultShippingSettings());
  };

  const handleSave = async () => {
    if (!draft) {
      return;
    }

    try {
      const saved = await saveSettings(normalizeShippingSettings(draft));
      setDraft(saved);
      toast.success("Shipping settings saved");
    } catch (saveError) {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save shipping settings"
      );
    }
  };

  if (isLoading && !draft) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!draft) {
    return (
      <Card className="dark:bg-gray-900">
        <CardContent className="pt-6 text-sm text-red-500">
          {error || "Shipping settings are unavailable."}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-none dark:bg-transparent">
        <CardHeader className="px-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Truck className="h-6 w-6" />
                Shipping Settings
              </CardTitle>
              <CardDescription>
                FedEx ship-from defaults and editable package presets by item size.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleReset} disabled={!dirty || isSaving}>
                <Undo2 className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button onClick={handleSave} disabled={!dirty || isSaving}>
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Shipping Settings
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="dark:bg-gray-900">
        <CardHeader>
          <CardTitle>Ship From</CardTitle>
          <CardDescription>
            Default sender details for FedEx label purchases.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            ["name", "Name"],
            ["company", "Company"],
            ["phone", "Phone"],
            ["email", "Email"],
            ["line1", "Address Line 1"],
            ["line2", "Address Line 2"],
            ["city", "City"],
            ["state", "State"],
            ["postalCode", "Postal Code"],
            ["country", "Country"],
          ].map(([field, label]) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={`ship-from-${field}`}>{label}</Label>
              <Input
                id={`ship-from-${field}`}
                className={settingsInputClassName}
                value={(draft.shipFrom[field as keyof ShippingAddressInput] as string) || ""}
                onChange={(event) =>
                  updateShipFrom(
                    field as keyof ShippingAddressInput,
                    event.target.value
                  )
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="dark:bg-gray-900">
        <CardHeader>
          <CardTitle>Purchase Defaults</CardTitle>
          <CardDescription className="text-muted-foreground">
            Applied when you open the FedEx label dialog from the shipping column.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label>Pickup Type</Label>
            <Select
              value={draft.purchaseDefaults.pickupType}
              onValueChange={(value) => updatePurchaseDefault("pickupType", value)}
            >
              <SelectTrigger className={settingsSelectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pickupTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label>Signature</Label>
            <Select
              value={draft.purchaseDefaults.signatureOption}
              onValueChange={(value) =>
                updatePurchaseDefault("signatureOption", value)
              }
            >
              <SelectTrigger className={settingsSelectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {signatureOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label>Packaging Type</Label>
            <Select
              value={draft.purchaseDefaults.packagingType}
              onValueChange={(value) => updatePurchaseDefault("packagingType", value)}
            >
              <SelectTrigger className={settingsSelectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {packagingTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-2">
            <Label>Label Stock</Label>
            <Select
              value={draft.purchaseDefaults.labelStockType}
              onValueChange={(value) =>
                updatePurchaseDefault("labelStockType", value)
              }
            >
              <SelectTrigger className={settingsSelectTriggerClassName}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {labelStockOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {Object.values(ItemSizes).map((size) => (
          <Card key={size} className="flex flex-col overflow-hidden dark:bg-gray-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                <span className="text-muted-foreground">Template size</span>{" "}
                <span className="font-semibold tracking-tight text-foreground">
                  {formatItemSizeTitle(size)}
                </span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Orders with this item size get these package rows prefilled in the FedEx
                dialog.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-0">
              <div className="divide-y divide-border">
                {draft.packagePresetsBySize[size].map((preset, index) => (
                  <div
                    key={preset.id}
                    className="bg-muted/20 px-4 py-4 dark:bg-muted/10"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-foreground">
                        Package {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                        onClick={() => removePreset(size, preset.id)}
                        aria-label={`Remove package ${index + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-foreground/90">Label</Label>
                        <Input
                          className={settingsInputClassName}
                          value={preset.label || ""}
                          onChange={(event) =>
                            updatePreset(size, preset.id, "label", event.target.value)
                          }
                          placeholder="e.g. Main carton, hardware box"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                          ["length", "Length"],
                          ["width", "Width"],
                          ["height", "Height"],
                          ["weight", "Weight"],
                        ].map(([field, label]) => (
                          <div key={field} className="min-w-0 space-y-2">
                            <Label className="text-foreground/90">{label}</Label>
                            <Input
                              className={settingsInputClassName}
                              type="number"
                              min="0"
                              step="0.1"
                              value={formatPackageNumberForInput(
                                preset[
                                  field as keyof ShippingPackagePreset
                                ] as number
                              )}
                              onChange={(event) =>
                                updatePreset(
                                  size,
                                  preset.id,
                                  field as keyof ShippingPackagePreset,
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="mt-auto flex-col gap-2 border-t border-border bg-muted/30 px-4 py-3 dark:bg-muted/15">
              <Button
                type="button"
                variant="secondary"
                className="w-full gap-2 sm:w-auto sm:self-end"
                onClick={() => addPreset(size)}
              >
                <Plus className="h-4 w-4" />
                Add package
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
