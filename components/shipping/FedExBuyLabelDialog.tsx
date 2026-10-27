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

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OrderShippingAddressDialog } from "@/components/orders/OrderShippingAddressDialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { extraBoxPresetsForSize, normalizeShippingSettings } from "@/config/shipping-defaults";
import { DEFAULT_RECIPIENT_PHONE, ETSY_LABEL_HINT_SIZES } from "@/config/fedex-accounts";
import { cheapestRate, groupRatesByService, rateKey } from "@/lib/shipping-labels/rate-groups";
import {
  chargeMismatchWarning,
  draftSourceHash,
  recipientAddressWarnings,
  type RecipientAddress,
} from "@/lib/shipping-labels/buy-label-draft";
import {
  activePurchase,
  orderPurchaseFields,
  purchaseTrackingNumbers,
  type StoredPurchase,
} from "@/lib/shipping-labels/purchase-records";
import {
  INTERNATIONAL_NOT_SUPPORTED_MESSAGE,
  isDomesticDestination,
} from "@/lib/shipping-labels/purchase-request";
import { resolveShippingRecipientDraft } from "@/lib/shipping-recipient-prefill";
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

type ShipmentDraft = FedExShipmentDraft & { shipTo: RecipientAddress };
/** Saved with the browser draft to detect a changed order address or settings. */
type StoredShipmentDraft = ShipmentDraft & { sourceHash?: string };

const HTTP_CONFLICT = 409;
const DRAFT_SAVE_DEBOUNCE_MS = 300;

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
  ["state", "State / Province"],
  ["postalCode", "Postal Code"],
  ["country", "Country code"],
];

const RECIPIENT_FIELD_ROWS: [keyof RecipientAddress, string][] =
  ADDRESS_FIELD_ROWS.flatMap((row): [keyof RecipientAddress, string][] =>
    row[0] === "line2" ? [row, ["line3", "Address Line 3"]] : [row]
  );

function describePurchase(purchase: StoredPurchase): string {
  const tracking = purchaseTrackingNumbers(purchase).join(", ");
  const boughtOn = purchase.purchasedAt
    ? new Date(purchase.purchasedAt).toLocaleDateString()
    : "an earlier date";
  return `tracking ${tracking}, bought ${boughtOn}`;
}

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
    country: "",
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

function initializeDraft(item: Item, settings: ReturnType<typeof normalizeShippingSettings>): ShipmentDraft {
  const size = item.size as ItemSizes | undefined;
  const packages =
    (size && settings.boxPresetsBySize[size]?.length
      ? settings.boxPresetsBySize[size]
      : extraBoxPresetsForSize(size) ?? [createPackage(1)]
    ).map((pkg, index) => ({
      ...pkg,
      id: `${pkg.id}-${index}`,
    }));

  return {
    shipFrom: { ...settings.shipFrom },
    shipTo: emptyAddress(),
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

/** Multi-line postal-style preview for at-a-glance address review */
function AddressCard({ address }: { address: ShippingAddressInput }) {
  const name = address.name?.trim();
  const company = address.company?.trim();
  const line1 = address.line1?.trim();
  const line2 = address.line2?.trim();
  const city = address.city?.trim();
  const state = address.state?.trim();
  const postalCode = address.postalCode?.trim();
  const country = address.country?.trim();
  const phone = address.phone?.trim();
  const email = address.email?.trim();

  const cityLine = [
    [city, state].filter(Boolean).join(", "),
    postalCode,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="mt-1 space-y-0.5 font-mono text-sm leading-snug text-gray-800 dark:text-gray-200">
      {name ? (
        <div className="font-semibold text-gray-900 dark:text-gray-100">
          {name}
        </div>
      ) : null}
      {company ? <div>{company}</div> : null}
      {line1 ? <div>{line1}</div> : null}
      {line2 ? <div>{line2}</div> : null}
      {cityLine ? <div>{cityLine}</div> : null}
      {country && country.toUpperCase() !== "US" ? (
        <div>{country}</div>
      ) : null}
      {phone || email ? (
        <div className="pt-1 font-sans text-xs text-gray-600 dark:text-gray-400">
          {phone}
          {phone && email ? " · " : null}
          {email}
        </div>
      ) : null}
    </div>
  );
}

export function FedExBuyLabelDialog({ item }: { item: Item }) {
  const [open, setOpen] = useState(false);
  const [editingSavedAddress, setEditingSavedAddress] = useState(false);
  const [draft, setDraft] = useState<ShipmentDraft | null>(null);
  const [rates, setRates] = useState<FedExRateQuote[]>([]);
  const [unpricedServiceTypes, setUnpricedServiceTypes] = useState<string[]>([]);
  /** Key of the chosen price: a service on a particular FedEx account. */
  const [selectedRateKey, setSelectedRateKey] = useState("");
  const [accountErrors, setAccountErrors] = useState<
    { accountId: string; accountLabel: string; error: string; unavailable?: boolean }[]
  >([]);
  /** What FedEx said about the recipient address when rates were last requested. */
  const [addressCheck, setAddressCheck] = useState<string | null>(null);
  const [isFetchingRates, setIsFetchingRates] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Shown after a purchase that needs attention (price change, failed follow-up). */
  const [purchaseNotices, setPurchaseNotices] = useState<string[]>([]);
  const purchaseInFlightRef = useRef(false);
  /** The user already confirmed buying a second label for this order. */
  const repurchaseConfirmedRef = useRef(false);
  const draftSourceHashRef = useRef<string>("");
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
  const pausePolling = useShippingStore((state) => state.pausePolling);
  const resumePolling = useShippingStore((state) => state.resumePolling);
  const fetchTrackingInfo = useTrackingStore((state) => state.fetchTrackingInfo);
  const loadItems = useOrderStore((state) => state.loadItems);

  const selectedRate = useMemo(
    () => rates.find((rate) => rateKey(rate) === selectedRateKey),
    [rates, selectedRateKey]
  );
  const rateGroups = useMemo(() => groupRatesByService(rates), [rates]);
  const cheapestKey = useMemo(() => {
    const cheapest = cheapestRate(rates);
    return cheapest ? rateKey(cheapest) : "";
  }, [rates]);
  const sizeText = item.size?.trim() || "";
  const hasBoxPreset = Boolean(
    sizeText &&
      (shippingSettings?.boxPresetsBySize?.[sizeText as ItemSizes]?.length ||
        extraBoxPresetsForSize(sizeText))
  );
  const suggestsEtsyLabel = ETSY_LABEL_HINT_SIZES.includes(sizeText);

  const saveDraft = (value: ShipmentDraft) => {
    const stored: StoredShipmentDraft = {
      ...value,
      sourceHash: draftSourceHashRef.current,
    };
    saveFedExShipmentDraft(item.id, stored);
  };

  const existingPurchase = activePurchase(orderPurchaseFields(item));
  const recipientWarnings = useMemo(
    () => (draft ? recipientAddressWarnings(draft.shipTo) : []),
    [draft]
  );
  // A blank country is incomplete, not international.
  const isInternational = draft
    ? Boolean(draft.shipTo.country?.trim()) && !isDomesticDestination(draft.shipTo)
    : false;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && existingPurchase) {
      const confirmed = window.confirm(
        `This order already has a FedEx label (${describePurchase(existingPurchase)}). Buy another label anyway?`
      );
      if (!confirmed) return;
      repurchaseConfirmedRef.current = true;
    }
    if (!nextOpen) repurchaseConfirmedRef.current = false;
    setOpen(nextOpen);
  };

  /** Any edit invalidates the quotes on screen: they no longer match the shipment. */
  const editDraft = (
    updater: (current: ShipmentDraft | null) => ShipmentDraft | null
  ) => {
    setDraft(updater);
    setRates([]);
    setUnpricedServiceTypes([]);
    setAccountErrors([]);
    setAddressCheck(null);
    setSelectedRateKey("");
    setPurchaseNotices([]);
  };

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

  // Pause label polling while the dialog is open. Otherwise the 60s
  // fetchAllLabels tick ripples through subscribers (isLoading flip,
  // labels object swap) and ends up wiping inputs / re-expanding the
  // collapsed address sections mid-edit.
  useEffect(() => {
    if (!open) return;
    pausePolling();
    return () => {
      resumePolling();
    };
  }, [open, pausePolling, resumePolling]);

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
    const sourceHash = draftSourceHash({
      shippingDetails: item.shippingDetails,
      customerName: item.customerName,
      settingsUpdatedAt: shippingSettings.updatedAt,
    });
    draftSourceHashRef.current = sourceHash;
    // A saved draft only survives while the order address and settings are
    // unchanged; the saved recipient always wins over a draft's recipient.
    const cached = loadFedExShipmentDraft(item.id) as StoredShipmentDraft | null;
    let cachedDraft: ShipmentDraft | null = null;
    if (cached?.sourceHash === sourceHash) {
      const { sourceHash: _savedHash, ...rest } = cached;
      cachedDraft = rest;
    } else if (cached) {
      clearFedExShipmentDraft(item.id);
    }
    const nextDraft: ShipmentDraft = resolveShippingRecipientDraft(item, base, cachedDraft);
    setDraft(nextDraft);
    const shipFromOk = isShipFromSectionComplete(nextDraft.shipFrom);
    const recipientOk = isRecipientSectionComplete(nextDraft.shipTo);
    setAddressSectionsOpen(!(shipFromOk && recipientOk));
    setRates([]);
    setUnpricedServiceTypes([]);
    setAccountErrors([]);
    setAddressCheck(null);
    setSelectedRateKey("");
    setError(null);
    setPurchaseNotices([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- item is current row; keyed by item.id
  }, [open, shippingSettings, item.id]);

  useEffect(() => {
    if (!open || !draft) {
      return;
    }
    const t = window.setTimeout(() => {
      saveDraft(draft);
    }, DRAFT_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [draft, open, item.id]);

  useEffect(() => {
    if (prevOpenRef.current && !open && draft) {
      saveDraft(draft);
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
    field: keyof RecipientAddress,
    value: string | boolean
  ) => {
    editDraft((current) =>
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
    editDraft((current) =>
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
    editDraft((current) =>
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
    editDraft((current) =>
      current
        ? {
            ...current,
            packages: [...current.packages, createPackage(current.packages.length + 1)],
          }
        : current
    );
  };

  const removePackage = (packageId: string) => {
    editDraft((current) => {
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
      setError("Complete the recipient and box details before requesting rates.");
      return;
    }
    if (isInternational) {
      setError(INTERNATIONAL_NOT_SUPPORTED_MESSAGE);
      return;
    }

    setIsFetchingRates(true);
    setError(null);
    setPurchaseNotices([]);

    try {
      // Ask FedEx whether the address is a home or a business first, so the
      // quotes carry the right delivery surcharge. A failed check never blocks
      // quoting: the Residential switch as shown is used.
      const checkedDraft = await applyAddressCheck(draft);
      const response = await fetch("/api/shipping/fedex/rates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(checkedDraft),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch FedEx rates");
      }

      // Only priced quotes come back; services without a price are listed apart
      // and can never be selected.
      const nextRates = (data.rates || []) as FedExRateQuote[];
      setRates(nextRates);
      setUnpricedServiceTypes((data.unpricedServiceTypes || []) as string[]);
      // An account that is not linked to the API key is skipped without a warning.
      setAccountErrors(
        ((data.accountErrors || []) as typeof accountErrors).filter((entry) => !entry.unavailable)
      );
      const cheapest = cheapestRate(nextRates);
      setSelectedRateKey(cheapest ? rateKey(cheapest) : "");
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

  /** Sets the Residential switch from FedEx's classification; returns the draft to quote. */
  const applyAddressCheck = async (current: ShipmentDraft): Promise<ShipmentDraft> => {
    try {
      const response = await fetch("/api/shipping/fedex/validate-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shipTo: current.shipTo }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Address check failed");

      const notes: string[] = [];
      let next = current;
      if (data.residential === true || data.residential === false) {
        notes.push(`FedEx classifies this address as ${data.residential ? "residential" : "a business"}.`);
        if (data.residential !== (current.shipTo.residential ?? true)) {
          next = { ...current, shipTo: { ...current.shipTo, residential: data.residential } };
          setDraft(next);
        }
      } else {
        notes.push(
          `FedEx could not tell if this is a home or a business; keeping "${(current.shipTo.residential ?? true) ? "Residential" : "Business"}".`
        );
      }
      notes.push(...((data.warnings || []) as string[]));
      setAddressCheck(notes.join(" "));
      return next;
    } catch (checkError) {
      setAddressCheck(
        `Address check unavailable (${checkError instanceof Error ? checkError.message : "error"}); using the Residential setting shown.`
      );
      return current;
    }
  };

  const requestPurchase = (confirmRepurchase: boolean) =>
    fetch("/api/shipping/fedex/purchase", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: item.id,
        serviceType: selectedRate?.serviceType ?? "",
        ...(selectedRate?.accountId ? { accountId: selectedRate.accountId } : {}),
        quotedNetCharge: selectedRate?.totalNetCharge ?? null,
        confirmRepurchase,
        ...draft,
      }),
    });

  const handlePurchase = async () => {
    if (!draft || !selectedRate) {
      setError("Choose a FedEx service before purchasing.");
      return;
    }
    if (isInternational) {
      setError(INTERNATIONAL_NOT_SUPPORTED_MESSAGE);
      return;
    }
    // Double-submit guard: state updates are async, the ref is immediate.
    if (purchaseInFlightRef.current) return;
    purchaseInFlightRef.current = true;

    setIsPurchasing(true);
    setError(null);
    setPurchaseNotices([]);

    try {
      let response = await requestPurchase(repurchaseConfirmedRef.current);
      let data = await response.json().catch(() => ({}));
      if (response.status === HTTP_CONFLICT && data.existingPurchase) {
        const confirmed = window.confirm(
          `This order already has a FedEx label (${describePurchase(data.existingPurchase)}). Buy another label anyway?`
        );
        if (!confirmed) return;
        repurchaseConfirmedRef.current = true;
        response = await requestPurchase(true);
        data = await response.json().catch(() => ({}));
      }
      if (!response.ok) {
        throw new Error(data.error || "Failed to purchase FedEx label");
      }

      await Promise.all([fetchAllLabels({ force: true }), fetchTrackingInfo(), loadItems()]);
      clearFedExShipmentDraft(item.id);

      const purchased = data.purchasedShipment as StoredPurchase | undefined;
      const notices = [
        chargeMismatchWarning(
          selectedRate.totalNetCharge,
          purchased?.totalNetCharge,
          purchased?.currency || selectedRate.currency
        ),
        ...((data.warnings || []) as string[]),
      ].filter((notice): notice is string => Boolean(notice));

      setDraft(null);
      setRates([]);
      setUnpricedServiceTypes([]);
      setAccountErrors([]);
      setAddressCheck(null);
      setSelectedRateKey("");
      if (notices.length) {
        // Keep the dialog open so the price change / follow-up problem is seen.
        setPurchaseNotices([
          `Label purchased (tracking ${purchased ? purchaseTrackingNumbers(purchased).join(", ") : "unknown"}).`,
          ...notices,
        ]);
        return;
      }
      handleOpenChange(false);
    } catch (purchaseError) {
      setError(
        purchaseError instanceof Error
          ? purchaseError.message
          : "Failed to purchase FedEx label"
      );
    } finally {
      purchaseInFlightRef.current = false;
      setIsPurchasing(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-2 rounded-full bg-gradient-to-br from-violet-600/15 to-orange-500/15 px-3 text-sm font-medium text-violet-700 hover:bg-violet-100 dark:text-violet-300 dark:hover:bg-violet-950"
        >
          <Truck className="h-4 w-4" />
          Purchase Label
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
                  This order has no saved shipping details. Enter the recipient below
                  before requesting rates, or save an address in the order details.
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

            {purchaseNotices.length ? (
              <Alert className="border-amber-500 !bg-amber-50 !text-amber-950 dark:!bg-amber-950 dark:!text-amber-50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Check this label</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc space-y-1 pl-4">
                    {purchaseNotices.map((notice) => (
                      <li key={notice}>{notice}</li>
                    ))}
                  </ul>
                </AlertDescription>
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
                          Recipient comes from saved order details. Changes here apply to this label only.
                        </p>
                        {!addressSectionsOpen &&
                        isRecipientSectionComplete(draft.shipTo) ? (
                          <AddressCard address={draft.shipTo} />
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
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="mb-2 h-auto px-0 py-1 text-blue-600 dark:text-blue-400"
                      disabled={isFetchingRates || isPurchasing}
                      onClick={() => setEditingSavedAddress(true)}
                    >
                      Edit saved address
                    </Button>
                    <label className="mt-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <Checkbox
                        checked={draft.shipTo.residential ?? true}
                        onCheckedChange={(checked) =>
                          updateAddress("shipTo", "residential", checked === true)
                        }
                      />
                      Residential address
                    </label>
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
                        {RECIPIENT_FIELD_ROWS.map(([field, label]) => (
                          <div key={field} className="space-y-2">
                            <Label>{label}</Label>
                            <Input
                              className={ordersInputClassName}
                              value={(draft.shipTo[field] as string) || ""}
                              placeholder={field === "phone" ? `${DEFAULT_RECIPIENT_PHONE} (used if blank)` : undefined}
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
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Boxes</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Box rows are seeded from the size preset map and can be overridden.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
                      onClick={addPackage}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Box
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {draft.packages.map((pkg, index) => (
                      <div
                        key={pkg.id}
                        className="rounded-lg border border-gray-200 bg-gray-100 p-4 dark:border-gray-600 dark:bg-gray-700"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <div className="font-medium">Box {index + 1}</div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePackage(pkg.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
                          {draft.packages.length > 1 ? (
                            <div className="space-y-2 md:col-span-5">
                              <Label>Label</Label>
                              <Input
                                className={ordersInputClassName}
                                value={pkg.label || ""}
                                onChange={(event) =>
                                  updatePackage(pkg.id, "label", event.target.value)
                                }
                              />
                            </div>
                          ) : null}
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

                {isInternational ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>International shipment</AlertTitle>
                    <AlertDescription>{INTERNATIONAL_NOT_SUPPORTED_MESSAGE}</AlertDescription>
                  </Alert>
                ) : null}

                {recipientWarnings.length ? (
                  <Alert className="border-amber-500 !bg-amber-50 !text-amber-950 dark:!bg-amber-950 dark:!text-amber-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Check the recipient address</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc space-y-1 pl-4">
                        {recipientWarnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                ) : null}

                {!hasBoxPreset && sizeText ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No box preset for this size</AlertTitle>
                    <AlertDescription>
                      "{sizeText}" is a custom or nonstandard size. Enter the boxes yourself before requesting rates.
                    </AlertDescription>
                  </Alert>
                ) : null}

                {suggestsEtsyLabel ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Check Etsy's label first</AlertTitle>
                    <AlertDescription>
                      Etsy's own label is often much cheaper for {sizeText} (for a 16 x 6, about $34 on Etsy versus ~$80 on FedEx).
                    </AlertDescription>
                  </Alert>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-600 dark:bg-gray-800">
                  <Button
                    onClick={handleGetRates}
                    disabled={isFetchingRates || isPurchasing || isInternational}
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
                          Choose the price to purchase for this shipment. The cheapest is selected.
                        </p>
                        {addressCheck ? (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{addressCheck}</p>
                        ) : null}
                        {accountErrors.map((entry) => (
                          <p key={entry.accountId} className="text-xs text-amber-700 dark:text-amber-300">
                            {entry.accountLabel} could not be quoted: {entry.error}
                          </p>
                        ))}
                        {unpricedServiceTypes.length ? (
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            FedEx returned no price for{" "}
                            {unpricedServiceTypes.join(", ")}; not offered for purchase.
                          </p>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {rateGroups.map((group) => {
                          const isSelected = group.quotes.some((quote) => rateKey(quote) === selectedRateKey);
                          return (
                            <div
                              key={group.serviceType}
                              className={cn(
                                "overflow-hidden rounded-xl border-2 bg-white text-left text-gray-900 transition dark:bg-gray-800 dark:text-gray-100",
                                isSelected
                                  ? "border-blue-500 dark:border-blue-400"
                                  : "border-gray-200 dark:border-gray-700"
                              )}
                            >
                              <div className="p-4">
                                <div className="font-semibold">{group.serviceName}</div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {group.estimatedDeliveryDate || group.transitTime || "Delivery estimate unavailable"}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{group.serviceType}</div>
                              </div>
                              <div
                                className={cn(
                                  "grid gap-2 border-t border-gray-200 p-3 dark:border-gray-600",
                                  group.quotes.length > 1 ? "grid-cols-2" : "grid-cols-1"
                                )}
                              >
                                {group.quotes.map((quote) => {
                                  const key = rateKey(quote);
                                  const quoteSelected = key === selectedRateKey;
                                  return (
                                    <button
                                      key={key}
                                      type="button"
                                      aria-pressed={quoteSelected}
                                      onClick={() => setSelectedRateKey(key)}
                                      className={cn(
                                        "rounded-lg border-2 px-3 py-2 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-blue-500",
                                        quoteSelected
                                          ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
                                          : "border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700/40"
                                      )}
                                    >
                                      <div className="text-xs text-gray-500 dark:text-gray-400">
                                        {quote.accountLabel || "FedEx account"}
                                        {key === cheapestKey ? (
                                          <span className="ml-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                            · Cheapest
                                          </span>
                                        ) : null}
                                      </div>
                                      <div className="font-semibold tabular-nums">
                                        {new Intl.NumberFormat("en-US", {
                                          style: "currency",
                                          currency: quote.currency || "USD",
                                        }).format(quote.totalNetCharge)}
                                      </div>
                                    </button>
                                  );
                                })}
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
                                      !selectedRate ||
                                      isInternational
                                    }
                                    onClick={() => handlePurchase()}
                                  >
                                    {isPurchasing ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                    )}
                                    Buy label{selectedRate?.accountLabel ? ` · ${selectedRate.accountLabel}` : ""}
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
    {editingSavedAddress ? (
      <OrderShippingAddressDialog
        item={item}
        onClose={() => setEditingSavedAddress(false)}
        onSaved={(savedItem) => {
          setDraft((current) =>
            current
              ? resolveShippingRecipientDraft(savedItem, current, current)
              : current
          );
          setRates([]);
          setAccountErrors([]);
          setAddressCheck(null);
          setSelectedRateKey("");
          setError(null);
        }}
      />
    ) : null}
    </>
  );
}
