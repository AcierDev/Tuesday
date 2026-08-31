"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Loader2,
  PackageCheck,
  Printer,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFutureLabelInventory } from "@/hooks/useFutureLabelInventory";
import { printFutureLabels } from "@/lib/shipping-labels/client-print";
import {
  defaultShippingLabelFilter,
  filterShippingLabelInventory,
  normalizeUnusedSelection,
  shippingLabelInventoryCounts,
  type ShippingLabelInventoryFilter,
} from "@/lib/shipping-labels/inventory";
import { classifyShippingLabel } from "@/lib/shipping-labels/status";
import type {
  ShippingLabelCarrier,
  ShippingLabelRecord,
} from "@/types/shipping-labels";
import { cn } from "@/utils/functions";

const FILTERS: Array<{
  value: ShippingLabelInventoryFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "unused", label: "Unused" },
  { value: "used", label: "Used" },
  { value: "issues", label: "Issues" },
];

const CARRIERS: ShippingLabelCarrier[] = ["UPS", "FedEx", "USPS", "DHL"];

function words(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryPresentation(record: ShippingLabelRecord) {
  const category = classifyShippingLabel(record);
  if (category === "unused") {
    return {
      label: "Unused",
      icon: PackageCheck,
      className: "bg-amber-500/10 text-amber-300 ring-amber-500/30",
    };
  }
  if (category === "used") {
    return {
      label: `Used · ${words(record.tracker?.status ?? "unknown")}`,
      icon: CheckCircle2,
      className: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30",
    };
  }
  return {
    label: "Needs review",
    icon: AlertTriangle,
    className: "bg-red-500/10 text-red-300 ring-red-500/30",
  };
}

export function FutureLabelInventory({ orderId }: { orderId: string }) {
  const {
    labels,
    isLoading,
    busyLabelId,
    error,
    rescan,
    correctTracking,
    remove,
  } = useFutureLabelInventory(orderId);
  const [filterOverride, setFilterOverride] =
    useState<ShippingLabelInventoryFilter | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [printing, setPrinting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [repairLabelId, setRepairLabelId] = useState<string | null>(null);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState<ShippingLabelCarrier>("UPS");
  const counts = useMemo(
    () => shippingLabelInventoryCounts(labels),
    [labels]
  );
  const filter = filterOverride ?? defaultShippingLabelFilter(labels);
  const selectableIds = useMemo(
    () => normalizeUnusedSelection(selectedIds, labels),
    [labels, selectedIds]
  );
  const visibleLabels = useMemo(
    () => filterShippingLabelInventory(labels, filter),
    [filter, labels]
  );
  const visibleUnusedIds = useMemo(
    () =>
      visibleLabels
        .filter((record) => classifyShippingLabel(record) === "unused")
        .map((record) => record.id),
    [visibleLabels]
  );

  const handlePrint = async (
    request:
      | { orderId: string; scope: "unused" }
      | { orderId: string; labelIds: string[] }
  ) => {
    setPrinting(true);
    setLocalError(null);
    try {
      await printFutureLabels(request);
    } catch (printError) {
      setLocalError(
        printError instanceof Error
          ? printError.message
          : "Labels could not be printed."
      );
    } finally {
      setPrinting(false);
    }
  };

  const toggleSelection = (labelId: string) => {
    setSelectedIds(() => {
      const next = new Set(selectableIds);
      if (next.has(labelId)) next.delete(labelId);
      else next.add(labelId);
      return next;
    });
  };

  const handleRepair = async () => {
    if (!repairLabelId || !trackingNumber.trim()) return;
    try {
      await correctTracking(repairLabelId, trackingNumber.trim(), carrier);
      setRepairLabelId(null);
      setTrackingNumber("");
    } catch {
      // The hook exposes the server error in the inventory alert.
    }
  };

  if (isLoading && labels.length === 0) {
    return (
      <section className="rounded-xl border border-blue-500/20 bg-blue-500/[0.04] p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Organizing label pages…
        </div>
      </section>
    );
  }

  if (labels.length === 0) return null;

  return (
    <section
      aria-label="Individual shipping labels"
      className="space-y-3 rounded-xl border border-blue-500/20 bg-gradient-to-b from-blue-500/[0.06] to-transparent p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">Individual labels</h3>
          <p className="text-xs text-muted-foreground">
            Pre-transit labels are unused. Every other tracking status is used.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void handlePrint({ orderId, scope: "unused" })}
            disabled={printing || counts.unused === 0}
            className="bg-amber-500 text-slate-950 hover:bg-amber-400"
          >
            {printing ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Printer className="mr-1.5 h-4 w-4" />
            )}
            Print all unused ({counts.unused})
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              void handlePrint({ orderId, labelIds: [...selectableIds] })
            }
            disabled={printing || selectableIds.size === 0}
          >
            <Printer className="mr-1.5 h-4 w-4" />
            Print selected ({selectableIds.size})
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg bg-background/60 p-1 ring-1 ring-border/70">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilterOverride(option.value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === option.value
                  ? "bg-blue-500 text-white"
                  : "text-muted-foreground hover:bg-blue-500/10 hover:text-foreground"
              )}
            >
              {option.label} {counts[option.value]}
            </button>
          ))}
        </div>
        {visibleUnusedIds.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set(visibleUnusedIds))}
          >
            Select shown unused
          </Button>
        )}
      </div>

      {(error || localError) && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{localError ?? error}</AlertDescription>
        </Alert>
      )}

      <div className="grid max-h-[310px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {visibleLabels.map((record) => {
          const category = classifyShippingLabel(record);
          const presentation = categoryPresentation(record);
          const StatusIcon = presentation.icon;
          const busy = busyLabelId === record.id;
          return (
            <article
              key={record.id}
              className={cn(
                "rounded-lg border bg-background/80 p-3 transition-colors",
                selectableIds.has(record.id)
                  ? "border-amber-400/70 ring-1 ring-amber-400/40"
                  : "border-border/70"
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {category === "unused" && (
                      <input
                        type="checkbox"
                        aria-label={`Select label page ${record.pageNumber}`}
                        checked={selectableIds.has(record.id)}
                        onChange={() => toggleSelection(record.id)}
                        className="h-4 w-4 accent-amber-500"
                      />
                    )}
                    <span className="font-medium text-foreground">
                      Label {record.pageNumber}
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-muted-foreground" title={record.sourceFileName}>
                    {record.sourceFileName} · page {record.pageNumber} of {record.pageCount}
                  </p>
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ring-1 ring-inset",
                    presentation.className
                  )}
                >
                  <StatusIcon className="h-3 w-3" /> {presentation.label}
                </span>
              </div>

              <div className="mt-2 min-h-9 text-xs">
                {record.trackingNumber ? (
                  <>
                    <p className="font-mono text-foreground">
                      {record.carrier} · {record.trackingNumber}
                    </p>
                    {record.tracker?.status_detail && (
                      <p className="text-muted-foreground">
                        {words(record.tracker.status_detail)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-red-300">
                    {record.processingError ?? "Tracking is still being scanned."}
                  </p>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={() =>
                    window.open(
                      `/api/shipping/labels/${encodeURIComponent(record.id)}/pdf`,
                      "_blank",
                      "noopener,noreferrer"
                    )
                  }
                >
                  <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                </Button>
                {category === "unused" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      void handlePrint({ orderId, labelIds: [record.id] })
                    }
                    disabled={printing}
                  >
                    <Printer className="mr-1 h-3.5 w-3.5" /> Print
                  </Button>
                )}
                {category === "issues" && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => void rescan(record.id)}
                      disabled={busy}
                    >
                      <RefreshCw
                        className={cn("mr-1 h-3.5 w-3.5", busy && "animate-spin")}
                      />
                      Retry
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => setRepairLabelId(record.id)}
                    >
                      <Wrench className="mr-1 h-3.5 w-3.5" /> Fix tracking
                    </Button>
                  </>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-label={`Delete label page ${record.pageNumber}`}
                  className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => {
                    if (window.confirm("Delete this individual label page?")) {
                      void remove(record.id);
                    }
                  }}
                  disabled={busy}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {visibleLabels.length === 0 && (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No labels match this filter.
        </p>
      )}

      {repairLabelId && (
        <div className="rounded-lg border border-red-500/25 bg-red-500/[0.05] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                Repair unreadable tracking
              </p>
              <p className="text-xs text-muted-foreground">
                Only needed when automatic scanning cannot read this page.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setRepairLabelId(null)}
            >
              Cancel
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-[140px_1fr_auto]">
            <div>
              <Label htmlFor="future-label-carrier" className="sr-only">
                Carrier
              </Label>
              <select
                id="future-label-carrier"
                value={carrier}
                onChange={(event) =>
                  setCarrier(event.target.value as ShippingLabelCarrier)
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {CARRIERS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="future-label-tracking" className="sr-only">
                Tracking number
              </Label>
              <Input
                id="future-label-tracking"
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
                placeholder="Tracking number"
              />
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => void handleRepair()}
              disabled={!trackingNumber.trim() || busyLabelId === repairLabelId}
            >
              Save
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
