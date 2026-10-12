import type { Item, ShippingAddressInput } from "@/typings/types";
import type { FedExShipmentDraft } from "@/utils/fedex-shipment-draft-storage";

const COUNTRY_CODE_LENGTH = 2;
const CONTACT_FIELD_MAPPINGS = [
  ["name", "name"], ["company", "company"],
  ["phone", "phone"], ["buyer_email", "email"],
] as const;

/** Saved recipients are authoritative; browser drafts retain other shipment choices. */
export function resolveShippingRecipientDraft(
  item: Pick<Item, "customerName" | "shippingDetails">,
  base: FedExShipmentDraft,
  cached: FedExShipmentDraft | null
): FedExShipmentDraft {
  const details = item.shippingDetails;
  // A default country or contact name alone is not a saved postal address.
  const hasSavedAddress = details && [
    details.street1, details.street2, details.street3,
    details.city, details.state, details.postalCode,
  ].some((field) => Boolean(field?.trim()));

  if (!hasSavedAddress) {
    const savedContacts: Partial<ShippingAddressInput> = {};
    let hasSavedContact = false;
    for (const [source, destination] of CONTACT_FIELD_MAPPINGS) {
      if (details && Object.hasOwn(details, source) && details[source] !== undefined) {
        savedContacts[destination] = details[source] ?? "";
        hasSavedContact = true;
      }
    }
    if (cached && !hasSavedContact) return cached;

    const recipient = cached?.shipTo ?? {
      company: "", phone: "", email: "", line2: "", residential: true,
      ...base.shipTo,
      name: base.shipTo.name || item.customerName || "",
    };
    return { ...(cached ?? base), shipTo: { ...recipient, ...savedContacts } };
  }

  const country = details?.country?.trim() || "";
  const shipTo: ShippingAddressInput = {
    name: details?.name?.trim() || item.customerName || "",
    company: details?.company || "",
    phone: details?.phone || "",
    email: details?.buyer_email || "",
    line1: details?.street1 || "",
    line2: [details?.street2, details?.street3]
      .map((line) => line?.trim())
      .filter(Boolean)
      .join(", "),
    city: details?.city || "",
    state: details?.state || "",
    postalCode: details?.postalCode || "",
    country: country.length === COUNTRY_CODE_LENGTH && /^[a-z]+$/i.test(country)
      ? country.toUpperCase()
      : country,
    residential: details?.residential ?? true,
  };

  return { ...(cached ?? base), shipTo };
}
