import { ItemStatus, type Item } from "../typings/types";

export function canMarkOrderWip(item: Pick<Item, "status" | "deleted" | "visible">) {
  return item.status !== ItemStatus.Done && item.status !== ItemStatus.Hidden &&
    item.deleted !== true && item.visible !== false;
}

export function isOrderWip(item: Pick<Item, "status" | "isWip" | "deleted" | "visible">) {
  return canMarkOrderWip(item) && (item.isWip === true || item.status === ItemStatus.Wip);
}

export function orderBoardStatus(status: ItemStatus): ItemStatus {
  return status === ItemStatus.Wip ? ItemStatus.OnDeck : status;
}

export function orderWipToggle(item: Item): Item {
  if (!canMarkOrderWip(item)) return item;
  return {
    ...item,
    status: orderBoardStatus(item.status),
    isWip: !isOrderWip(item),
  };
}

export function normalizeOrderWipPatch(current: Item, incoming: Partial<Item>): Partial<Item> {
  const next = { ...current, ...incoming };
  const moved = incoming.status !== undefined && incoming.status !== current.status;
  return moved || !canMarkOrderWip(next)
    ? { ...incoming, isWip: false }
    : incoming;
}
