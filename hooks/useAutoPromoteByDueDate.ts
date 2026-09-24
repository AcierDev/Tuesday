"use client";

import { useEffect, useMemo, useRef } from "react";

import type { Item } from "@/typings/types";

const RECONCILE_ENDPOINT = "/api/items/reconcile-on-deck";

export function useAutoPromoteByDueDate(items: Item[] | undefined) {
  const inFlightRef = useRef(false);
  const rerunRequestedRef = useRef(false);
  const mountedRef = useRef(true);

  const reconciliationKey = useMemo(
    () =>
      (items ?? [])
        .map((item) =>
          [
            item.id,
            item.status,
            item.prevStatus ?? "",
            item.dueDate ?? "",
            item.onHold ? "held" : "active",
            item.deleted ? "deleted" : "live",
          ].join("|")
        )
        .sort()
        .join("\n"),
    [items]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!reconciliationKey) return;

    const requestReconciliation = async () => {
      if (inFlightRef.current) {
        rerunRequestedRef.current = true;
        return;
      }

      inFlightRef.current = true;
      try {
        do {
          rerunRequestedRef.current = false;
          try {
            const response = await fetch(RECONCILE_ENDPOINT, {
              method: "POST",
            });
            if (!response.ok) {
              throw new Error("Failed to reconcile On Deck orders");
            }
          } catch (error) {
            console.error("Auto-promote reconciliation failed", error);
          }
        } while (mountedRef.current && rerunRequestedRef.current);
      } finally {
        inFlightRef.current = false;
      }
    };

    void requestReconciliation();
  }, [reconciliationKey]);
}
