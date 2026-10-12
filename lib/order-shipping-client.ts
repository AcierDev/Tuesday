"use client";
import type { EtsyOrderLink, Item, ShippingDetails } from "@/typings/types";
import { useOrderStore } from "@/stores/useOrderStore";
import { isPlainRecord, normalizeOrderShippingInput } from "@/lib/order-shipping-patch";

export type OrderShippingChanges = { shippingDetails?: Partial<ShippingDetails>; etsyOrder?: EtsyOrderLink };
const ITEMS_API = "/api/items";
const EXPECTED_MATCH_COUNT = 1;

function confirmedMetadata(result: Record<string, unknown>, updates: OrderShippingChanges) {
  for (const field of ["shippingDetails", "etsyOrder"] as const) {
    const incoming = updates[field];
    if (!incoming) continue;
    const stored = result[field];
    if (!isPlainRecord(stored) || Object.keys(incoming).some(key => !Object.hasOwn(stored, key))) {
      throw new Error("The address save wasn't confirmed. Reopen the order and try again.");
    }
    // Validate corrected fields while retaining untouched legacy fields as returned.
    normalizeOrderShippingInput({ [field]: Object.fromEntries(Object.keys(incoming).map(key => [key, stored[key]])) });
  }
}

export async function saveOrderShipping(item: Item, updates: OrderShippingChanges): Promise<Item> {
  const response = await fetch(ITEMS_API, { method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: item.id, updates }) });
  const result = await response.json();
  if (!response.ok || !isPlainRecord(result) || result.matchedCount !== EXPECTED_MATCH_COUNT) throw new Error(result?.error || "Couldn't save address. Try again.");
  confirmedMetadata(result, updates);
  const metadata: Pick<Partial<Item>, "shippingDetails" | "etsyOrder"> = {
    ...(updates.shippingDetails ? { shippingDetails: result.shippingDetails as ShippingDetails } : {}),
    ...(updates.etsyOrder ? { etsyOrder: result.etsyOrder as EtsyOrderLink } : {}),
  };
  const state = useOrderStore.getState();
  const latest = state.items.find(order => order.id === item.id) ?? state.scheduledItems.find(order => order.id === item.id) ?? item;
  const saved = { ...latest, ...metadata } as Item;
  useOrderStore.setState(current => ({
    items: current.items.map(order => order.id === item.id ? { ...order, ...metadata } : order),
    allItems: current.allItems.map(order => order.id === item.id ? { ...order, ...metadata } : order),
    scheduledItems: current.scheduledItems.map(order => order.id === item.id ? { ...order, ...metadata } : order),
    doneItems: current.doneItems.map(order => order.id === item.id ? { ...order, ...metadata } : order),
  }));
  return saved;
}
