"use client";

import { useState } from "react";
import { AlertCircle, Ban, Loader2, RefreshCw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  hasPendingFollowUps,
  isLivePurchase,
  orderPurchaseFields,
  purchaseHistory,
  purchaseTrackingNumbers,
  PURCHASE_SOURCE_FEDEX_API,
  type StoredPurchase,
} from "@/lib/shipping-labels/purchase-records";
import { useOrderStore } from "@/stores/useOrderStore";
import { useShippingStore } from "@/stores/useShippingStore";
import { useTrackingStore } from "@/stores/useTrackingStore";
import type { Item } from "@/typings/types";
import { cn } from "@/utils/functions";

function formatCharge(purchase: StoredPurchase): string {
  if (purchase.totalNetCharge === null || purchase.totalNetCharge === undefined) {
    return "charge unknown";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: purchase.currency || "USD",
  }).format(Number(purchase.totalNetCharge));
}

function followUpProblem(purchase: StoredPurchase): string | null {
  if (purchase.voidedAt) return null;
  if (purchase.labelStatus === "failed") {
    return `Label not saved: ${purchase.labelError ?? "unknown error"}`;
  }
  if (purchase.trackerStatus === "failed") {
    return `Tracking not started: ${purchase.trackerError ?? "unknown error"}`;
  }
  return null;
}

/** FedEx labels bought from the dashboard, with retry and void actions. */
export function PurchasedLabelsPanel({ item }: { item: Item }) {
  const purchases = purchaseHistory(orderPurchaseFields(item));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(
    null
  );
  const loadItems = useOrderStore((state) => state.loadItems);
  const fetchAllLabels = useShippingStore((state) => state.fetchAllLabels);
  const fetchTrackingInfo = useTrackingStore((state) => state.fetchTrackingInfo);

  if (purchases.length === 0) return null;

  const refresh = () =>
    Promise.all([loadItems(), fetchAllLabels(), fetchTrackingInfo()]);

  const post = async (url: string, body: unknown) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Request failed");
    return data as { warnings?: string[]; message?: string };
  };

  const handleRetry = async (purchase: StoredPurchase) => {
    if (!purchase.id || busyKey) return;
    setBusyKey(`retry-${purchase.id}`);
    setMessage(null);
    try {
      const data = await post("/api/shipping/fedex/purchase/retry", {
        orderId: item.id,
        purchaseId: purchase.id,
      });
      await refresh();
      setMessage(
        data.warnings?.length
          ? { tone: "error", text: data.warnings.join(" ") }
          : { tone: "info", text: "Label and tracking are saved." }
      );
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Retry failed",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleVoid = async (purchase: StoredPurchase) => {
    const trackingNumber = purchase.trackingNumber;
    if (!trackingNumber || busyKey) return;
    const confirmed = window.confirm(
      `Void FedEx label ${purchaseTrackingNumbers(purchase).join(", ")}? FedEx cancels the shipment, the label PDF is removed, and it can't be undone. Only void labels not yet handed to FedEx.`
    );
    if (!confirmed) return;

    setBusyKey(`void-${trackingNumber}`);
    setMessage(null);
    try {
      const data = await post("/api/shipping/fedex/cancel", {
        orderId: item.id,
        trackingNumber,
      });
      await refresh();
      setMessage({
        tone: data.warnings?.length ? "error" : "info",
        text: [data.message || "Label voided.", ...(data.warnings ?? [])].join(" "),
      });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Void failed",
      });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <section
      aria-label="Purchased FedEx labels"
      className="rounded-xl border border-blue-500/15 bg-blue-500/[0.03] p-3"
    >
      <h3 className="mb-2 text-sm font-semibold text-foreground">FedEx purchases</h3>
      <ul className="divide-y divide-border/60">
        {[...purchases].reverse().map((purchase) => {
          const key = purchase.id ?? purchase.trackingNumber ?? "purchase";
          const problem = followUpProblem(purchase);
          const canVoid =
            isLivePurchase(purchase) &&
            (!purchase.source || purchase.source === PURCHASE_SOURCE_FEDEX_API);
          return (
            <li key={key} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className={cn("min-w-0 text-sm", purchase.voidedAt && "opacity-60")}>
                <div className="font-mono text-xs text-foreground">
                  {purchaseTrackingNumbers(purchase).join(", ")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {purchase.serviceName ?? purchase.serviceType ?? "FedEx"} ·{" "}
                  {formatCharge(purchase)}
                  {purchase.purchasedAt
                    ? ` · ${new Date(purchase.purchasedAt).toLocaleDateString()}`
                    : ""}
                  {purchase.voidedAt ? " · Voided" : ""}
                </div>
                {problem && <div className="text-xs text-red-400">{problem}</div>}
              </div>
              <div className="flex items-center gap-1">
                {purchase.id && hasPendingFollowUps(purchase) && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    disabled={busyKey !== null}
                    onClick={() => void handleRetry(purchase)}
                  >
                    {busyKey === `retry-${purchase.id}` ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-1 h-3.5 w-3.5" />
                    )}
                    Retry
                  </Button>
                )}
                {canVoid && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    disabled={busyKey !== null}
                    onClick={() => void handleVoid(purchase)}
                  >
                    {busyKey === `void-${purchase.trackingNumber}` ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Ban className="mr-1 h-3.5 w-3.5" />
                    )}
                    Void label
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {message && (
        <Alert
          variant={message.tone === "error" ? "destructive" : "default"}
          className="mt-2 py-2"
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
