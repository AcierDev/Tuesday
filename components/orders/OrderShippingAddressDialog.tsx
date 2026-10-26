"use client";

import React, { useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OrderShippingFields } from "./OrderShippingFields";
import { saveOrderShipping } from "@/lib/order-shipping-client";
import type { EtsyOrderLink, Item, ShippingDetails } from "@/typings/types";

export function OrderShippingAddressDialog({ item, onClose, onSaved }: {
  item: Item; onClose: () => void; onSaved?: (item: Item) => void;
}) {
  const [savedItem, setSavedItem] = useState(item);
  const [shippingPatch, setShippingPatch] = useState<Partial<ShippingDetails>>({});
  const [etsyPatch, setEtsyPatch] = useState<EtsyOrderLink>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);
  const dirty = Boolean(Object.keys(shippingPatch).length || Object.keys(etsyPatch).length);
  const save = async () => {
    if (!dirty || savingRef.current) return;
    savingRef.current = true;
    setSaving(true); setError(null); setSaved(false);
    try {
      const result = await saveOrderShipping(savedItem, {
        ...(Object.keys(shippingPatch).length ? { shippingDetails: shippingPatch } : {}),
        ...(Object.keys(etsyPatch).length ? { etsyOrder: etsyPatch } : {}),
      });
      setSavedItem(result); setShippingPatch({}); setEtsyPatch({}); setSaved(true);
      onSaved?.(result);
    } catch (err) { setError(err instanceof Error ? err.message : "Couldn't save address. Try again."); }
    finally { savingRef.current = false; setSaving(false); }
  };
  return <Dialog open onOpenChange={open => !open && !saving && onClose()}>
    <DialogContent className="max-w-md max-h-[88vh] overflow-y-auto bg-white dark:bg-gray-950">
      <DialogHeader><DialogTitle>Shipping address</DialogTitle>
        <DialogDescription>{item.customerName} · Saved on this order for future labels.</DialogDescription>
      </DialogHeader>
      <OrderShippingFields disabled={saving} address={{ ...savedItem.shippingDetails, ...shippingPatch }}
        etsyOrder={{ ...savedItem.etsyOrder, ...etsyPatch }}
        onAddressChange={patch => { setShippingPatch(previous => ({ ...previous, ...patch })); setSaved(false); }}
        onEtsyChange={patch => { setEtsyPatch(previous => ({ ...previous, ...patch })); setSaved(false); }} />
      {error ? <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p> :
        <p role="status" className="text-xs text-gray-500 dark:text-gray-400">{saving ? "Saving…" : dirty ? "Unsaved changes" : saved ? "Saved to order" : savedItem.shippingDetails?.street1 ? "Saved address" : "No saved address"}</p>}
      <div className="flex justify-end gap-2 border-t border-gray-200 pt-3 dark:border-gray-800">
        <button type="button" className="rounded-md px-3 py-2 text-sm text-gray-700 dark:text-gray-200" disabled={saving} onClick={onClose}>Close</button>
        <button type="button" className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={saving || !dirty} onClick={save}>{saving ? "Saving…" : "Save address"}</button>
      </div>
    </DialogContent>
  </Dialog>;
}
