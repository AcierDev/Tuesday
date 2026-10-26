import type { Item } from "../typings/types";

export const VERTICAL_CUSTOMER_TAG = "(vertical)";
const VERTICAL_TAG_PATTERN = /\(vertical\)/i;
const VERTICAL_TAGS_WITH_SPACING = /[ \t]*\(vertical\)/gi;

type OrderOrientation = Pick<Item, "customerName" | "tags">;

function nameHasVerticalTag(customerName?: string): boolean {
  return VERTICAL_TAG_PATTERN.test(customerName ?? "");
}

// A saved vertical choice or a manual tag both mean vertical. The original order
// form saved isVertical: false on every order, so a saved false never hides a
// "(vertical)" tag that is still in the name.
export function orderIsVertical(item?: OrderOrientation): boolean {
  return item?.tags?.isVertical === true || nameHasVerticalTag(item?.customerName);
}

export function customerNameWithOrientation(customerName: string, vertical: boolean): string {
  const manualName = customerName.replace(VERTICAL_TAGS_WITH_SPACING, "").trim();
  return vertical
    ? [manualName, VERTICAL_CUSTOMER_TAG].filter(Boolean).join(" ")
    : manualName;
}

// New orders never lose a typed tag; either signal saves the order as vertical.
export function normalizeNewOrderOrientation(item: Item): Item {
  return orderIsVertical(item)
    ? {
      ...item,
      customerName: customerNameWithOrientation(item.customerName ?? "", true),
      tags: { ...item.tags, isVertical: true },
    }
    : item;
}

// "(vertical)" is removed only when this request turns a saved vertical choice
// off. Older clients resend isVertical: false with every save, so a false on an
// order that was never saved as vertical leaves the name exactly as sent.
export function normalizeOrderOrientationPatch(current: Item, incoming: Partial<Item>): Partial<Item> {
  const updates = incoming.tags
    ? { ...incoming, tags: { ...current.tags, ...incoming.tags } }
    : incoming;
  const requested = incoming.tags?.isVertical;
  const savedVertical = current.tags?.isVertical === true;
  const turnedOff = requested === false && savedVertical;
  const editedName = typeof incoming.customerName === "string";
  const name = incoming.customerName ?? current.customerName ?? "";
  if (turnedOff || requested === true || (savedVertical && editedName)) {
    return { ...updates, customerName: customerNameWithOrientation(name, !turnedOff) };
  }
  // Legacy orders: the name is the source of truth. Never persist a saved false
  // next to a tag that is still in the name.
  return updates.tags && nameHasVerticalTag(name)
    ? { ...updates, tags: { ...updates.tags, isVertical: true } }
    : updates;
}
