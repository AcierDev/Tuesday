import type { Item } from "@/typings/types";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 👯 DUPLICATE CUSTOMER NAMES                                           ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// An order is flagged when another non-deleted order's customer name contains
// its name. Computed once per active-items array (shared across every name
// cell) instead of one full scan per cell per render.

interface DuplicateIndex {
  items: readonly Item[];
  candidates: readonly Item[];
  memberIds: Set<string>;
  duplicateIds: Set<string>;
}

let lastIndex: DuplicateIndex | null = null;

function hasOtherContainingName(
  item: Pick<Item, "id" | "customerName">,
  candidates: readonly Item[]
): boolean {
  const name = item.customerName;
  if (!name) return false;
  return candidates.some(
    (other) => other.id !== item.id && !!other.customerName?.includes(name)
  );
}

function buildIndex(items: readonly Item[]): DuplicateIndex {
  if (lastIndex?.items === items) return lastIndex;
  const candidates = items.filter((other) => !other.deleted && other.customerName);
  const memberIds = new Set<string>();
  const duplicateIds = new Set<string>();
  for (const item of items) {
    memberIds.add(item.id);
    if (hasOtherContainingName(item, candidates)) duplicateIds.add(item.id);
  }
  lastIndex = { items, candidates, memberIds, duplicateIds };
  return lastIndex;
}

export function duplicateNameIds(items: readonly Item[]): Set<string> {
  return buildIndex(items).duplicateIds;
}

// `items` is the active list. Orders outside it (e.g. Done) are checked
// against it directly, matching the store's original checkDuplicate.
export function isDuplicateName(
  item: Pick<Item, "id" | "customerName">,
  items: readonly Item[]
): boolean {
  const index = buildIndex(items);
  if (index.memberIds.has(item.id)) return index.duplicateIds.has(item.id);
  return hasOtherContainingName(item, index.candidates);
}
