import { DueBadge } from "../components/cells/DueBadge";
import { useOrderStats } from "../hooks/useOrderStats";
import type { Item } from "../typings/types";

declare const item: Item;
declare const items: Item[] | undefined;

export function FixedThresholdContracts() {
  useOrderStats({ items });
  return <DueBadge item={item} />;
}
