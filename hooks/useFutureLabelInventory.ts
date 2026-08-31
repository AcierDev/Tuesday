"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { resumeIncompleteLabels } from "@/lib/shipping-labels/client";
import {
  deleteFutureLabel,
  listFutureLabels,
  scanFutureLabel,
} from "@/lib/shipping-labels/client-api";
import { useShippingStore } from "@/stores/useShippingStore";
import { useTrackingStore } from "@/stores/useTrackingStore";
import type {
  ShippingLabelCarrier,
  ShippingLabelRecord,
} from "@/types/shipping-labels";

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Shipping-label inventory could not be updated.";
}

export function useFutureLabelInventory(orderId: string) {
  const [labels, setLabels] = useState<ShippingLabelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busyLabelId, setBusyLabelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const fetchAllLabels = useShippingStore((state) => state.fetchAllLabels);
  const fetchTrackingInfo = useTrackingStore(
    (state) => state.fetchTrackingInfo
  );
  const orderTrackers = useTrackingStore(
    (state) =>
      state.trackingInfo.find((tracking) => tracking.orderId === orderId)
        ?.trackers
  );
  const currentLabels = useMemo(() => {
    if (!orderTrackers?.length) return labels;
    const trackersById = new Map(
      orderTrackers.map((tracker) => [tracker.id, tracker])
    );
    return labels.map((record) => {
      const tracker = record.trackerId
        ? trackersById.get(record.trackerId)
        : undefined;
      return tracker
        ? {
            ...record,
            processingStatus: "ready" as const,
            trackingNumber: tracker.tracking_code,
            tracker,
          }
        : record;
    });
  }, [labels, orderTrackers]);

  const load = useCallback(
    async (resumeScanning: boolean) => {
      const sequence = ++requestSequence.current;
      setIsLoading(true);
      setError(null);
      try {
        let nextLabels = await listFutureLabels(orderId);
        if (resumeScanning) {
          const resumed = await resumeIncompleteLabels(nextLabels, {
            scan: scanFutureLabel,
          });
          if (resumed.length > 0) {
            nextLabels = await listFutureLabels(orderId);
            await fetchTrackingInfo();
          }
        }
        if (sequence === requestSequence.current) setLabels(nextLabels);
        await fetchAllLabels();
      } catch (loadError) {
        if (sequence === requestSequence.current) {
          setError(errorMessage(loadError));
        }
      } finally {
        if (sequence === requestSequence.current) setIsLoading(false);
      }
    },
    [fetchAllLabels, fetchTrackingInfo, orderId]
  );

  useEffect(() => {
    void load(true);
    return () => {
      requestSequence.current += 1;
    };
  }, [load]);

  const refresh = useCallback(() => load(false), [load]);

  const rescan = useCallback(
    async (labelId: string) => {
      setBusyLabelId(labelId);
      setError(null);
      try {
        await scanFutureLabel(labelId);
        await Promise.all([load(false), fetchTrackingInfo()]);
      } catch (scanError) {
        setError(errorMessage(scanError));
      } finally {
        setBusyLabelId(null);
      }
    },
    [fetchTrackingInfo, load]
  );

  const correctTracking = useCallback(
    async (
      labelId: string,
      trackingNumber: string,
      carrier: ShippingLabelCarrier
    ) => {
      setBusyLabelId(labelId);
      setError(null);
      try {
        const corrected = await scanFutureLabel(labelId, {
          trackingNumber,
          carrier,
        });
        if (corrected.processingStatus !== "ready") {
          throw new Error(
            corrected.processingError ?? "Tracking information is invalid."
          );
        }
        await Promise.all([load(false), fetchTrackingInfo()]);
      } catch (correctionError) {
        setError(errorMessage(correctionError));
        throw correctionError;
      } finally {
        setBusyLabelId(null);
      }
    },
    [fetchTrackingInfo, load]
  );

  const remove = useCallback(
    async (labelId: string) => {
      setBusyLabelId(labelId);
      setError(null);
      try {
        await deleteFutureLabel(labelId);
        await load(false);
      } catch (deleteError) {
        setError(errorMessage(deleteError));
      } finally {
        setBusyLabelId(null);
      }
    },
    [load]
  );

  return {
    labels: currentLabels,
    isLoading,
    busyLabelId,
    error,
    refresh,
    rescan,
    correctTracking,
    remove,
  };
}
