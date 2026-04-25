"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, Plus, Truck, X } from "lucide-react";
import { toast } from "sonner";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { normalizeShippingSettings } from "@/config/shipping-defaults";
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

const AUTO_SAVE_DEBOUNCE_MS = 600;

export function ShippingSettingsEditor() {
  const { settings, isLoading, isSaving, error, fetchSettings, saveSettings } =
    useShippingSettingsStore();
  const [draft, setDraft] = useState<ShippingSettings | null>(null);
  const initialSyncDoneRef = useRef(false);

  useEffect(() => {
    fetchSettings().catch(() => undefined);
  }, [fetchSettings]);

  // Sync draft from server only on initial load — otherwise post-save settings
  // updates would clobber edits the user made while the request was in flight.
  useEffect(() => {
    if (settings && !initialSyncDoneRef.current) {
      setDraft(normalizeShippingSettings(settings));
      initialSyncDoneRef.current = true;
    }
  }, [settings]);

  const dirty = useMemo(() => isDirty(draft, settings), [draft, settings]);

  const persistDraft = (value: ShippingSettings) => {
    saveSettings(normalizeShippingSettings(value)).catch((saveError) => {
      toast.error(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save shipping settings"
      );
    });
  };

  useEffect(() => {
    if (!draft || !dirty || isSaving) return;

    const handle = setTimeout(() => persistDraft(draft), AUTO_SAVE_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [draft, dirty, isSaving, saveSettings]);

  const handleBlurFlush = () => {
    if (!draft || !dirty || isSaving) return;
    persistDraft(draft);
  };

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
    <div className="space-y-6" onBlurCapture={handleBlurFlush}>
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {dirty || isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span>Saved</span>
                </>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="dark:bg-gray-900">
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger asChild>
            <CardHeader className="group cursor-pointer flex flex-row items-center justify-between gap-3 hover:bg-muted/40 transition-colors rounded-t-lg">
              <div>
                <CardTitle>Ship From</CardTitle>
                <CardDescription>
                  Default sender details for FedEx label purchases.
                </CardDescription>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card className="dark:bg-gray-900">
        <Collapsible defaultOpen={false}>
          <CollapsibleTrigger asChild>
            <CardHeader className="group cursor-pointer flex flex-row items-center justify-between gap-3 hover:bg-muted/40 transition-colors rounded-t-lg">
              <div>
                <CardTitle>Purchase Defaults</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Applied when you open the FedEx label dialog from the shipping column.
                </CardDescription>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
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
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <Card className="dark:bg-gray-900">
        <CardHeader>
          <CardTitle>Package Presets by Size</CardTitle>
          <CardDescription>
            Orders with a given item size get these package rows prefilled in the FedEx
            dialog.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Accordion type="multiple" className="w-full">
            {Object.values(ItemSizes).map((size) => {
              const presets = draft.packagePresetsBySize[size];
              return (
                <AccordionItem key={size} value={size} className="border-b last:border-b-0 px-4">
                  <AccordionTrigger className="mx-2 my-1 rounded-md border border-transparent px-3 text-left hover:no-underline hover:border-border">
                    <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                      <span className="font-semibold tracking-tight text-foreground">
                        {formatItemSizeTitle(size)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {presets.length} {presets.length === 1 ? "package" : "packages"}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
                      {presets.map((preset, index) => (
                        <div
                          key={preset.id}
                          className="bg-muted/20 px-4 py-4 dark:bg-muted/10"
                        >
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-foreground">
                              Package {index + 1}
                            </span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                  aria-label={`Remove package ${index + 1}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Remove package {index + 1}?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This package preset for{" "}
                                    {formatItemSizeTitle(size)} will be deleted.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => removePreset(size, preset.id)}
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
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
                    <div className="mt-3 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        className="gap-2"
                        onClick={() => addPreset(size)}
                      >
                        <Plus className="h-4 w-4" />
                        Add package
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
