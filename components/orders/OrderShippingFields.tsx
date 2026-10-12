"use client";

import React, { useId } from "react";
import type { EtsyOrderLink, ShippingDetails } from "@/typings/types";

const ADDRESS_TEXT_LIMIT = 500;
const COUNTRY_CODE_LENGTH = 2;
const FIRST_ETSY_UNIT = 1;
const FIELD_CLASS = "mt-1 h-9 w-full rounded-md border border-gray-200 bg-white px-2.5 text-sm text-gray-900 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100";
const ADDRESS_FIELDS = [
  ["name", "Recipient name"], ["company", "Recipient company"],
  ["street1", "Address line 1"], ["street2", "Address line 2 / unit"],
  ["city", "City"], ["state", "State / province"],
  ["postalCode", "Postal code"], ["country", "Country code"],
] as const;

export function OrderShippingFields({ address, etsyOrder, onAddressChange, onEtsyChange, disabled = false }: {
  address?: Partial<ShippingDetails>;
  etsyOrder?: EtsyOrderLink;
  onAddressChange: (patch: Partial<ShippingDetails>) => void;
  onEtsyChange: (patch: EtsyOrderLink) => void;
  disabled?: boolean;
}) {
  const prefix = useId();
  const field = (key: keyof ShippingDetails, label: string, type = "text") => (
    <label key={key} className={key === "street1" || key === "street2" || key === "street3" ? "col-span-2 text-xs text-gray-600 dark:text-gray-300" : "text-xs text-gray-600 dark:text-gray-300"}>
      {label}
      <input id={`${prefix}-${key}`} aria-label={label} type={type} disabled={disabled}
        value={typeof address?.[key] === "string" ? address[key] as string : ""}
        maxLength={key === "country" ? COUNTRY_CODE_LENGTH : ADDRESS_TEXT_LIMIT}
        placeholder={key === "country" ? "US, CA, GB…" : undefined}
        className={FIELD_CLASS}
        onChange={event => onAddressChange({ [key]: key === "country" ? event.target.value.toUpperCase() : event.target.value })} />
    </label>
  );
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-2.5">{ADDRESS_FIELDS.map(([key, label]) => field(key, label))}
      {address?.street3 ? field("street3", "Address line 3") : null}
    </div>
    <details className="text-xs text-gray-600 dark:text-gray-300">
      <summary className="cursor-pointer py-1">Contact & Etsy link</summary>
      <div className="mt-2 grid grid-cols-2 gap-2.5">
        {field("phone", "Recipient phone", "tel")}{field("buyer_email", "Recipient email", "email")}
        {([ ["receiptId", "Etsy receipt ID"], ["transactionId", "Etsy item ID"] ] as const).map(([key, label]) => <label key={key}>
          {label}<input aria-label={label} disabled={disabled} inputMode="numeric" value={etsyOrder?.[key] ?? ""}
            className={FIELD_CLASS} maxLength={ADDRESS_TEXT_LIMIT}
            onChange={event => onEtsyChange({ [key]: event.target.value })} />
        </label>)}
        <label>Etsy unit<input aria-label="Etsy unit" type="number" min={FIRST_ETSY_UNIT} step={FIRST_ETSY_UNIT}
          disabled={disabled} value={etsyOrder?.quantityIndex ?? FIRST_ETSY_UNIT} className={FIELD_CLASS}
          onChange={event => onEtsyChange({ quantityIndex: event.target.value ? Number(event.target.value) : FIRST_ETSY_UNIT })} /></label>
      </div>
      <p className="mt-2 text-gray-500 dark:text-gray-400">Only link IDs confirmed on the Etsy receipt and purchased item.</p>
    </details>
  </div>;
}
