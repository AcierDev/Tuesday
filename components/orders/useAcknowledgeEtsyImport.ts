"use client";

import { useEffect } from "react";
import { needsEtsyImportReview } from "@/lib/etsy/import-review";
import { useOrderStore } from "@/stores/useOrderStore";
import type { Item } from "@/typings/types";

/** Opening an imported order counts as reviewing it: clear its badge once. */
export function useAcknowledgeEtsyImport(item: Item | null | undefined) {
  const id = item?.id;
  const pending = item ? needsEtsyImportReview(item) : false;
  useEffect(() => {
    if (!id || !pending) return;
    const { items, doneItems, scheduledItems, updateItem } = useOrderStore.getState();
    const latest = [...items, ...doneItems, ...scheduledItems].find((order) => order.id === id);
    if (latest && needsEtsyImportReview(latest)) {
      updateItem({ ...latest, etsyImportReview: false }).catch((error) => {
        console.error("Could not clear the Etsy import badge", error);
      });
    }
  }, [id, pending]);
}
