"use client";

import {
  forwardRef,
  type ForwardedRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Truck,
  X,
} from "lucide-react";

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
import {
  normalizeShippingSettings,
  validateShippingSettingsInput,
} from "@/config/shipping-defaults";
import { useShippingSettingsStore } from "@/stores/useShippingSettingsStore";
import {
  ItemSizes,
  type ShippingAddressInput,
  type ShippingBoxPreset,
  type ShippingSettings,
} from "@/typings/types";
import {
  formatBoxNumberForInput,
  parseBoxNumericInput,
} from "@/utils/shipping-box-input";

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

function createBoxPreset(index: number): ShippingBoxPreset {
  return {
    id: `pkg-${Date.now()}-${index}`,
    label: "",
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
  };
}

function isDirty<T>(a: T | null, b: T | null) {
  if (!a || !b) {
    return false;
  }

  return JSON.stringify(a) !== JSON.stringify(b);
}

const AUTO_SAVE_DEBOUNCE_MS = 600;

interface DraftAutosaveOptions<T> {
  draft: T | null;
  saved: T | null;
  isSaving: boolean;
  save: (value: T) => Promise<unknown>;
  debounceMs?: number;
}

// Debounced autosave for an editable draft. A failed save is not retried
// automatically: the exact draft that failed is remembered and skipped until
// the next edit produces a new draft object (or the user hits Retry).
export function useDraftAutosave<T>({
  draft,
  saved,
  isSaving,
  save,
  debounceMs = AUTO_SAVE_DEBOUNCE_MS,
}: DraftAutosaveOptions<T>) {
  const [failedDraft, setFailedDraft] = useState<T | null>(null);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const savedRef = useRef(saved);
  savedRef.current = saved;
  const saveRef = useRef(save);
  saveRef.current = save;
  const failedDraftRef = useRef<T | null>(null);
  const lastSavedDraftRef = useRef<T | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<boolean> | null>(null);

  const dirty = useMemo(() => isDirty(draft, saved), [draft, saved]);
  const saveFailed = draft !== null && draft === failedDraft;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const persistDraft = useCallback(
    (value: T): Promise<boolean> => {
      clearTimer();
      const attempt = saveRef.current(value).then(
        () => {
          lastSavedDraftRef.current = value;
          failedDraftRef.current = null;
          setFailedDraft(null);
          return true;
        },
        () => {
          failedDraftRef.current = value;
          setFailedDraft(value);
          return false;
        }
      );
      inFlightRef.current = attempt;
      void attempt.finally(() => {
        if (inFlightRef.current === attempt) inFlightRef.current = null;
      });
      return attempt;
    },
    [clearTimer]
  );

  useEffect(() => {
    if (!draft || !dirty || isSaving || draft === failedDraft) return;

    timerRef.current = setTimeout(() => void persistDraft(draft), debounceMs);

    return clearTimer;
  }, [draft, dirty, isSaving, failedDraft, debounceMs, persistDraft, clearTimer]);

  // Saves the pending edit now. Resolves false only when this save failed (the
  // error is then visible); a draft that already failed resolves true so a
  // second close discards it instead of trapping the user.
  const flush = useCallback(async (): Promise<boolean> => {
    clearTimer();
    const value = draftRef.current;
    if (!value || value === failedDraftRef.current) return true;
    if (inFlightRef.current) await inFlightRef.current;
    if (value === failedDraftRef.current) return false;
    if (value === lastSavedDraftRef.current) return true;
    if (!isDirty(value, savedRef.current)) return true;
    return persistDraft(value);
  }, [clearTimer, persistDraft]);

  // Safety net: an unmount that skipped flush() still saves the pending edit.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    const latestFlush = flushRef;
    return () => void latestFlush.current();
  }, []);

  const flushOnBlur = () => {
    if (!draft || !dirty || isSaving || saveFailed) return;
    void persistDraft(draft);
  };

  return { dirty, saveFailed, persistDraft, flush, flushOnBlur };
}

export interface ShippingSettingsEditorHandle {
  /** Saves any pending edit now; false when that save failed. */
  flush: () => Promise<boolean>;
}

function ShippingSettingsEditorImpl(
  _props: object,
  ref: ForwardedRef<ShippingSettingsEditorHandle>
) {
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

  const { dirty, saveFailed, persistDraft, flush, flushOnBlur } =
    useDraftAutosave({
      draft,
      saved: settings,
      isSaving,
      save: (value) => {
        // Never send a draft the server would reject (e.g. a new box whose
        // measurements are still 0); the reason is shown in the status area.
        const validation = validateShippingSettingsInput(value);
        if (!validation.ok) {
          return Promise.reject(new Error(validation.errors.join(" ")));
        }
        return saveSettings(validation.settings).catch((saveError) => {
          console.error(
            "Failed to save shipping settings",
            saveError instanceof Error ? saveError.message : saveError
          );
          throw saveError;
        });
      },
    });

  const draftValidationError = useMemo(() => {
    if (!draft) return null;
    const validation = validateShippingSettingsInput(draft);
    return validation.ok ? null : validation.errors[0] ?? null;
  }, [draft]);

  useImperativeHandle(ref, () => ({ flush }), [flush]);

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
    field: keyof ShippingBoxPreset,
    value: string
  ) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        boxPresetsBySize: {
          ...current.boxPresetsBySize,
          [size]: current.boxPresetsBySize[size].map((preset) =>
            preset.id === presetId
              ? {
                  ...preset,
                  [field]:
                    field === "label"
                      ? value
                      : parseBoxNumericInput(value),
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
        boxPresetsBySize: {
          ...current.boxPresetsBySize,
          [size]: [
            ...current.boxPresetsBySize[size],
            createBoxPreset(current.boxPresetsBySize[size].length + 1),
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

      const nextPresets = current.boxPresetsBySize[size].filter(
        (preset) => preset.id !== presetId
      );

      return {
        ...current,
        boxPresetsBySize: {
          ...current.boxPresetsBySize,
          [size]: nextPresets.length ? nextPresets : [createBoxPreset(1)],
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
    <div className="space-y-6" onBlurCapture={flushOnBlur}>
      <Card className="border-none shadow-none dark:bg-transparent">
        <CardHeader className="px-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Truck className="h-6 w-6" />
                Shipping Settings
              </CardTitle>
              <CardDescription>
                FedEx ship-from defaults and editable box presets by item size.
              </CardDescription>
            </div>
            <div
              className="flex items-center gap-2 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {draftValidationError ? (
                <>
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">
                    Not saved: {draftValidationError}
                  </span>
                </>
              ) : saveFailed && !isSaving ? (
                <>
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">
                    {error || "Couldn't save"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => void persistDraft(draft)}
                  >
                    Retry
                  </Button>
                </>
              ) : dirty || isSaving ? (
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
          <CardTitle>Box Presets by Size</CardTitle>
          <CardDescription>
            Orders with a given item size get these box rows prefilled in the FedEx
            dialog.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Accordion type="multiple" className="w-full">
            {Object.values(ItemSizes).map((size) => {
              const presets = draft.boxPresetsBySize[size];
              return (
                <AccordionItem key={size} value={size} className="border-b last:border-b-0 px-4">
                  <AccordionTrigger className="mx-2 my-1 rounded-md border border-transparent px-3 text-left hover:no-underline hover:border-border">
                    <div className="flex flex-1 items-center justify-between gap-3 pr-3">
                      <span className="font-semibold tracking-tight text-foreground">
                        {formatItemSizeTitle(size)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {presets.length} {presets.length === 1 ? "box" : "boxes"}
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
                              Box {index + 1}
                            </span>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                                  aria-label={`Remove box ${index + 1}`}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Remove box {index + 1}?
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This box preset for{" "}
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
                            {presets.length > 1 ? (
                              <div className="space-y-2">
                                <Label className="text-foreground/90">Label</Label>
                                <Input
                                  className={settingsInputClassName}
                                  value={preset.label || ""}
                                  onChange={(event) =>
                                    updatePreset(size, preset.id, "label", event.target.value)
                                  }
                                />
                              </div>
                            ) : null}
                            <div className="space-y-2">
                              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                Dimensions (in)
                              </Label>
                              <div className="grid grid-cols-3 gap-3">
                                {[
                                  ["length", "Length"],
                                  ["width", "Width"],
                                  ["height", "Height"],
                                ].map(([field, label]) => (
                                  <div key={field} className="min-w-0 space-y-2">
                                    <Label className="text-foreground/90">{label}</Label>
                                    <Input
                                      className={settingsInputClassName}
                                      type="number"
                                      min="0"
                                      step="0.1"
                                      value={formatBoxNumberForInput(
                                        preset[
                                          field as keyof ShippingBoxPreset
                                        ] as number
                                      )}
                                      onChange={(event) =>
                                        updatePreset(
                                          size,
                                          preset.id,
                                          field as keyof ShippingBoxPreset,
                                          event.target.value
                                        )
                                      }
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label className="text-foreground/90">Weight</Label>
                              <div className="relative w-32">
                                <Input
                                  className={`${settingsInputClassName} pr-10`}
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={formatBoxNumberForInput(preset.weight)}
                                  onChange={(event) =>
                                    updatePreset(
                                      size,
                                      preset.id,
                                      "weight",
                                      event.target.value
                                    )
                                  }
                                />
                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-muted-foreground">
                                  lbs
                                </span>
                              </div>
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
                        Add box
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

export const ShippingSettingsEditor = forwardRef(ShippingSettingsEditorImpl);
