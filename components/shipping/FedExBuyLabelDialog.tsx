"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Plus,
  ReceiptText,
  Truck,
  X,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/utils/functions";
import {
  formatBoxNumberForInput,
  parseBoxNumericInput,
} from "@/utils/shipping-box-input";
import {
  clearFedExShipmentDraft,
  loadFedExShipmentDraft,
  saveFedExShipmentDraft,
  type FedExShipmentDraft,
} from "@/utils/fedex-shipment-draft-storage";
import { normalizeShippingSettings } from "@/config/shipping-defaults";
import { useOrderStore } from "@/stores/useOrderStore";
import { useShippingSettingsStore } from "@/stores/useShippingSettingsStore";
import { useShippingStore } from "@/stores/useShippingStore";
import { useTrackingStore } from "@/stores/useTrackingStore";
import {
  ItemSizes,
  type FedExRateQuote,
  type Item,
  type ShippingAddressInput,
  type ShippingBoxPreset,
  type ShippingPurchaseDefaults,
} from "@/typings/types";

type ShipmentDraft = FedExShipmentDraft;

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

const packagingTypeOptions = [
  { value: "YOUR_PACKAGING", label: "Your packaging" },
];

const ADDRESS_FIELD_ROWS: [keyof ShippingAddressInput, string][] = [
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
];

/** Match orders page (`Header`, `ItemTableRow`) + search input styling */
const ordersInputClassName =
  "border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400";

const ordersSelectTriggerClassName =
  "border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400";

function emptyAddress(): ShippingAddressInput {
  return {
    name: "",
    company: "",
    phone: "",
    email: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    residential: true,
  };
}

function createPackage(index: number): ShippingBoxPreset {
  return {
    id: `pkg-${Date.now()}-${index}`,
    label: "",
    length: 0,
    width: 0,
    height: 0,
    weight: 0,
  };
}

function mapShippingDetailsToAddress(item: Item): ShippingAddressInput {
  const shippingDetails = item.shippingDetails;
  if (!shippingDetails) {
    return emptyAddress();
  }

  return {
    name: shippingDetails.name || item.customerName || "",
    company: shippingDetails.company || "",
    phone: shippingDetails.phone || "",
    email: shippingDetails.buyer_email || "",
    line1: shippingDetails.street1 || "",
    line2: shippingDetails.street2 || "",
    city: shippingDetails.city || "",
    state: shippingDetails.state?.slice(0, 2).toUpperCase() || "",
    postalCode: shippingDetails.postalCode || "",
    country: shippingDetails.country?.slice(0, 2).toUpperCase() || "US",
    residential: shippingDetails.residential,
  };
}

function initializeDraft(item: Item, settings: ReturnType<typeof normalizeShippingSettings>): ShipmentDraft {
  const size = item.size as ItemSizes | undefined;
  const packages =
    (size && settings.boxPresetsBySize[size]?.length
      ? settings.boxPresetsBySize[size]
      : [createPackage(1)]
    ).map((pkg, index) => ({
      ...pkg,
      id: `${pkg.id}-${index}`,
    }));

  return {
    shipFrom: { ...settings.shipFrom },
    shipTo: mapShippingDetailsToAddress(item),
    packages,
    purchaseDefaults: { ...settings.purchaseDefaults },
  };
}

function isValidDraft(draft: ShipmentDraft | null) {
  if (!draft) {
    return false;
  }

  if (
    !draft.shipFrom.postalCode ||
    !draft.shipTo.postalCode ||
    !draft.shipTo.country ||
    !draft.shipTo.line1 ||
    !draft.shipTo.city ||
    !draft.shipTo.state
  ) {
    return false;
  }

  return draft.packages.every(
    (pkg) => pkg.length > 0 && pkg.width > 0 && pkg.height > 0 && pkg.weight > 0
  );
}

function isShipFromSectionComplete(shipFrom: ShippingAddressInput): boolean {
  return Boolean(shipFrom.postalCode?.trim());
}

function isRecipientSectionComplete(shipTo: ShippingAddressInput): boolean {
  return Boolean(
    shipTo.postalCode?.trim() &&
      shipTo.country?.trim() &&
      shipTo.line1?.trim() &&
      shipTo.city?.trim() &&
      shipTo.state?.trim()
  );
}

/** One-line preview when a section is collapsed and complete */
function formatAddressSummary(address: ShippingAddressInput): string {
  const cityStateZip = [address.city, address.state, address.postalCode]
    .map((s) => s?.trim())
    .filter(Boolean)
    .join(", ");
  const line1 = address.line1?.trim();
  if (line1 && cityStateZip) {
    return `${line1} · ${cityStateZip}`;
  }
  if (cityStateZip) return cityStateZip;
  if (line1) return line1;
  return "";
}

export function FedExBuyLabelDialog({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ShipmentDraft | null>(null);
  const [rates, setRates] = useState<FedExRateQuote[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState("");
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Single toggle: Ship From and Recipient expand/collapse together */
  const [addressSectionsOpen, setAddressSectionsOpen] = useState(true);

  const shippingSettings = useShippingSettingsStore((state) => state.settings);
  const fetchShippingSettings = useShippingSettingsStore(
    (state) => state.fetchSettings
  );
  const shippingSettingsLoading = useShippingSettingsStore(
    (state) => state.isLoading
  );
  const fetchAllLabels = useShippingStore((state) => state.fetchAllLabels);
  const fetchTrackingInfo = useTrackingStore((state) => state.fetchTrackingInfo);
  const loadItems = useOrderStore((state) => state.loadItems);

  const selectedRate = useMemo(
    () => rates.find((rate) => rate.serviceType === selectedServiceType),
    [rates, selectedServiceType]
  );

  const liveRatesSectionRef = useRef<HTMLDivElement | null>(null);
  /** One init per dialog open so shippingSettings refetches do not wipe edits or cache */
  const initializedForOpenRef = useRef(false);
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (rates.length === 0 || isFetchingRates) {
      return;
    }
    requestAnimationFrame(() => {
      liveRatesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [rates, isFetchingRates]);

  useEffect(() => {
    if (open) {
      fetchShippingSettings(true).catch(() => undefined);
    }
  }, [open, fetchShippingSettings]);

  useEffect(() => {
    if (!open) {
      initializedForOpenRef.current = false;
      return;
    }
    if (!shippingSettings) {
      return;
    }
    if (initializedForOpenRef.current) {
      return;
    }
    initializedForOpenRef.current = true;

    const normalized = normalizeShippingSettings(shippingSettings);
    const base = initializeDraft(item, normalized);
    const cached = loadFedExShipmentDraft(item.id);
    const nextDraft = cached ?? base;
    setDraft(nextDraft);
    const shipFromOk = isShipFromSectionComplete(nextDraft.shipFrom);
    const recipientOk = isRecipientSectionComplete(nextDraft.shipTo);
    setAddressSectionsOpen(!(shipFromOk && recipientOk));
    setRates([]);
    setSelectedServiceType("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- item is current row; keyed by item.id
  }, [open, shippingSettings, item.id]);

  useEffect(() => {
    if (!open || !draft) {
      return;
    }
    const t = window.setTimeout(() => {
      saveFedExShipmentDraft(item.id, draft);
    }, 300);
    return () => window.clearTimeout(t);
  }, [draft, open, item.id]);

  useEffect(() => {
    if (prevOpenRef.current && !open && draft) {
      saveFedExShipmentDraft(item.id, draft);
    }
    prevOpenRef.current = open;
  }, [open, draft, item.id]);

  useEffect(() => {
    if (!draft) return;
    if (
      !isShipFromSectionComplete(draft.shipFrom) ||
      !isRecipientSectionComplete(draft.shipTo)
    ) {
      setAddressSectionsOpen(true);
    }
  }, [draft]);

  const updateAddress = (
    scope: "shipFrom" | "shipTo",
    field: keyof ShippingAddressInput,
    value: string
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            [scope]: {
              ...current[scope],
              [field]: value,
            },
          }
        : current
    );
  };

  const updatePurchaseDefault = (
    field: keyof ShippingPurchaseDefaults,
    value: string
  ) => {
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

  const updatePackage = (
    packageId: string,
    field: keyof ShippingBoxPreset,
    value: string
  ) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            packages: current.packages.map((pkg) =>
              pkg.id === packageId
                ? {
                    ...pkg,
                    [field]:
                      field === "label"
                        ? value
                        : parseBoxNumericInput(value),
                  }
                : pkg
            ),
          }
        : current
    );
  };

  const addPackage = () => {
    setDraft((current) =>
      current
        ? {
            ...current,
            packages: [...current.packages, createPackage(current.packages.length + 1)],
          }
        : current
    );
  };

  const removePackage = (packageId: string) => {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const nextPackages = current.packages.filter((pkg) => pkg.id !== packageId);
      return {
        ...current,
        packages: nextPackages.length ? nextPackages : [createPackage(1)],
      };
    });
  };

  const handleGetRates = async () => {
    if (!draft || !isValidDraft(draft)) {
      setError("Complete the recipient and package details before requesting rates.");
      return;
    }

    setIsFetchingRates(true);
    setError(null);

    try {
      const response = await fetch("/api/shipping/fedex/rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch FedEx rates");
      }

      const nextRates = (data.rates || []) as FedExRateQuote[];
      setRates(nextRates);
      setSelectedServiceType(nextRates[0]?.serviceType || "");
    } catch (rateError) {
      setError(
        rateError instanceof Error
          ? rateError.message
          : "Failed to fetch FedEx rates"
      );
    } finally {
      setIsFetchingRates(false);
    }
  };

  const handlePurchase = async () => {
    if (!draft || !selectedServiceType) {
      setError("Choose a FedEx service before purchasing.");
      return;
    }

    setIsPurchasing(true);
    setError(null);

    try {
      const response = await fetch("/api/shipping/fedex/purchase", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: item.id,
          serviceType: selectedServiceType,
          ...draft,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to purchase FedEx label");
      }

      await Promise.all([fetchAllLabels(), fetchTrackingInfo(), loadItems()]);
      toast.success(`FedEx label purchased for order ${item.id}`);
      clearFedExShipmentDraft(item.id);
      setDraft(null);
      setRates([]);
      setSelectedServiceType("");
      setOpen(false);
    } catch (purchaseError) {
      setError(
        purchaseError instanceof Error
          ? purchaseError.message
          : "Failed to purchase FedEx label"
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-600/15 to-orange-500/15 text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-950"
        >
          <Truck className="h-4 w-4" />
          <span className="sr-only">Buy FedEx label</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className={cn(
          "max-w-5xl gap-0 overflow-hidden p-0 sm:rounded-xl",
          "border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900",
          "[&>button.absolute]:text-gray-500 dark:[&>button.absolute]:text-gray-400"
        )}
      >
        <DialogHeader
          className={cn(
            "border-b border-gray-200 bg-white px-6 py-5 text-left dark:border-gray-700 dark:bg-gray-900"
          )}
        >
          <DialogTitle className="flex items-center gap-2 text-xl text-gray-900 dark:text-gray-100">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400">
              <ReceiptText className="h-5 w-5" />
            </span>
            Buy FedEx Label
          </DialogTitle>
          <DialogDescription className="text-gray-600 dark:text-gray-400">
            Order {item.id} for {item.customerName || "Unknown customer"}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh]">
          <div className="space-y-6 bg-slate-50 px-6 py-5 dark:bg-slate-950">
            {shippingSettingsLoading && !draft ? (
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading shipping settings...
              </div>
            ) : null}

            {!item.shippingDetails ? (
              <Alert
                className={cn(
                  "border-2 border-amber-500 shadow-sm",
                  /* Override Alert default bg-background / text-foreground so contrast is always correct */
                  "!bg-amber-100 !text-amber-950",
                  "dark:!bg-amber-950 dark:!text-amber-50 dark:border-amber-600",
                  "[&>svg]:!text-amber-800 dark:[&>svg]:!text-amber-300"
                )}
              >
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="!text-amber-950 dark:!text-amber-50">
                  Recipient address is incomplete
                </AlertTitle>
                <AlertDescription className="!text-amber-900 dark:!text-amber-100/95">
                  This item does not have imported shipping details yet. Enter them manually
                  below before requesting rates.
                </AlertDescription>
              </Alert>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>FedEx request failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {draft ? (
              <>
                <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                  <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <button
                      type="button"
                      id="fedex-ship-from-toggle"
                      aria-expanded={addressSectionsOpen}
                      aria-controls="fedex-ship-from-fields"
                      onClick={() => setAddressSectionsOpen((o) => !o)}
                      className="flex w-full items-start justify-between gap-3 rounded-lg text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          Ship From
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Defaults come from Shipping settings and can be overridden here.
                        </p>
                        {!addressSectionsOpen &&
                          isShipFromSectionComplete(draft.shipFrom) &&
                          formatAddressSummary(draft.shipFrom) ? (
                          <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                            {formatAddressSummary(draft.shipFrom)}
                          </p>
                        ) : null}
                      </div>
                      <ChevronDown
                        className={cn(
                          "mt-0.5 h-5 w-5 shrink-0 text-gray-500 transition-transform dark:text-gray-400",
                          addressSectionsOpen && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </button>
                    {addressSectionsOpen ? (
                      <motion.div
                        id="fedex-ship-from-fields"
                        role="region"
                        aria-labelledby="fedex-ship-from-toggle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 dark:border-gray-600 md:grid-cols-2"
                      >
                        {ADDRESS_FIELD_ROWS.map(([field, label]) => (
                          <div key={field} className="space-y-2">
                            <Label>{label}</Label>
                            <Input
                              className={ordersInputClassName}
                              value={
                                (draft.shipFrom[field] as string) || ""
                              }
                              onChange={(event) =>
                                updateAddress(
                                  "shipFrom",
                                  field,
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        ))}
                      </motion.div>
                    ) : null}
                  </section>

                  <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <button
                      type="button"
                      id="fedex-recipient-toggle"
                      aria-expanded={addressSectionsOpen}
                      aria-controls="fedex-recipient-fields"
                      onClick={() => setAddressSectionsOpen((o) => !o)}
                      className="flex w-full items-start justify-between gap-3 rounded-lg text-left outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          Recipient
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Prefilled from the item and fully editable before rate lookup.
                        </p>
                        {!addressSectionsOpen &&
                          isRecipientSectionComplete(draft.shipTo) &&
                          formatAddressSummary(draft.shipTo) ? (
                          <p className="truncate text-sm text-gray-600 dark:text-gray-400">
                            {formatAddressSummary(draft.shipTo)}
                          </p>
                        ) : null}
                      </div>
                      <ChevronDown
                        className={cn(
                          "mt-0.5 h-5 w-5 shrink-0 text-gray-500 transition-transform dark:text-gray-400",
                          addressSectionsOpen && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </button>
                    {addressSectionsOpen ? (
                      <motion.div
                        id="fedex-recipient-fields"
                        role="region"
                        aria-labelledby="fedex-recipient-toggle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.15 }}
                        className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 dark:border-gray-600 md:grid-cols-2"
                      >
                        {ADDRESS_FIELD_ROWS.map(([field, label]) => (
                          <div key={field} className="space-y-2">
                            <Label>{label}</Label>
                            <Input
                              className={ordersInputClassName}
                              value={(draft.shipTo[field] as string) || ""}
                              onChange={(event) =>
                                updateAddress(
                                  "shipTo",
                                  field,
                                  event.target.value
                                )
                              }
                            />
                          </div>
                        ))}
                      </motion.div>
                    ) : null}
                  </section>
                </div>

                <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Packages</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Package rows are seeded from the size preset map and can be overridden.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                      onClick={addPackage}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Package
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {draft.packages.map((pkg, index) => (
                      <div
                        key={pkg.id}
                        className="rounded-lg border border-gray-200 bg-gray-100 p-4 dark:border-gray-600 dark:bg-gray-700"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="font-medium">Package {index + 1}</div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePackage(pkg.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                          <div className="space-y-2 md:col-span-5">
                            <Label>Label</Label>
                            <Input
                              className={ordersInputClassName}
                              value={pkg.label || ""}
                              placeholder="Main carton, hardware box..."
                              onChange={(event) =>
                                updatePackage(pkg.id, "label", event.target.value)
                              }
                            />
                          </div>
                          {[
                            ["length", "Length"],
                            ["width", "Width"],
                            ["height", "Height"],
                            ["weight", "Weight"],
                          ].map(([field, label]) => (
                            <div key={field} className="space-y-2">
                              <Label>{label}</Label>
                              <Input
                                className={ordersInputClassName}
                                type="number"
                                min="0"
                                step="0.1"
                                value={formatBoxNumberForInput(
                                  pkg[
                                    field as keyof ShippingBoxPreset
                                  ] as number
                                )}
                                onChange={(event) =>
                                  updatePackage(
                                    pkg.id,
                                    field as keyof ShippingBoxPreset,
                                    event.target.value
                                  )
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">Shipment Options</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Adjust the defaults from settings before buying the label.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Pickup Type</Label>
                      <Select
                        value={draft.purchaseDefaults.pickupType}
                        onValueChange={(value) =>
                          updatePurchaseDefault("pickupType", value)
                        }
                      >
                        <SelectTrigger className={ordersSelectTriggerClassName}>
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
                    <div className="space-y-2">
                      <Label>Packaging Type</Label>
                      <Select
                        value={draft.purchaseDefaults.packagingType}
                        onValueChange={(value) =>
                          updatePurchaseDefault("packagingType", value)
                        }
                      >
                        <SelectTrigger className={ordersSelectTriggerClassName}>
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
                    <div className="space-y-2">
                      <Label>Signature</Label>
                      <Select
                        value={draft.purchaseDefaults.signatureOption}
                        onValueChange={(value) =>
                          updatePurchaseDefault("signatureOption", value)
                        }
                      >
                        <SelectTrigger className={ordersSelectTriggerClassName}>
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
                    <div className="space-y-2">
                      <Label>Label Stock</Label>
                      <Input
                        className={ordersInputClassName}
                        value={draft.purchaseDefaults.labelStockType}
                        onChange={(event) =>
                          updatePurchaseDefault("labelStockType", event.target.value)
                        }
                      />
                    </div>
                  </div>
                </section>

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-600 dark:bg-gray-800">
                  <Button
                    onClick={handleGetRates}
                    disabled={isFetchingRates || isPurchasing}
                    className="bg-blue-500 font-semibold text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                  >
                    {isFetchingRates ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Truck className="mr-2 h-4 w-4" />
                    )}
                    Get FedEx Rates
                  </Button>
                </div>

                {rates.length ? (
                  <div ref={liveRatesSectionRef}>
                    <Separator />
                    <section className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                          Live Contract Rates
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Choose the FedEx service to purchase for this shipment.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {rates.map((rate) => {
                          const isSelected = rate.serviceType === selectedServiceType;
                          return (
                            <div
                              key={rate.serviceType}
                              className={cn(
                                "overflow-hidden rounded-xl border-2 bg-white text-left text-gray-900 transition dark:bg-gray-800 dark:text-gray-100",
                                isSelected
                                  ? "border-blue-500 dark:border-blue-400"
                                  : "border-gray-200 dark:border-gray-700"
                              )}
                            >
                              <div
                                role="button"
                                tabIndex={0}
                                className={cn(
                                  "cursor-pointer p-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400",
                                  isSelected ? "rounded-t-xl" : "rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/40"
                                )}
                                onClick={() => setSelectedServiceType(rate.serviceType)}
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    setSelectedServiceType(rate.serviceType);
                                  }
                                }}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <div className="font-semibold">{rate.serviceName}</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-400">
                                      {rate.estimatedDeliveryDate || rate.transitTime || "Delivery estimate unavailable"}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-semibold tabular-nums">
                                      {new Intl.NumberFormat("en-US", {
                                        style: "currency",
                                        currency: rate.currency || "USD",
                                      }).format(rate.totalNetCharge)}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {rate.serviceType}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {isSelected ? (
                                <div className="rounded-b-xl border-t border-gray-200 bg-gray-50/80 p-4 pt-3 dark:border-gray-600 dark:bg-gray-900/40">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full border-gray-300 bg-white hover:bg-gray-50 dark:border-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600"
                                    disabled={
                                      isFetchingRates ||
                                      isPurchasing ||
                                      !selectedRate
                                    }
                                    onClick={() => handlePurchase()}
                                  >
                                    {isPurchasing ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                    )}
                                    Buy label
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
