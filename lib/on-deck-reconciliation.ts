import { isWithinDueBadgeWarningWindow } from "../config/due-badge";
import { ItemStatus, type Item } from "../typings/types";

export const ON_DECK_MIN_COUNT = 10;
export const ON_DECK_MAX_COUNT = 20;

const PROMOTABLE_STATUSES = new Set<ItemStatus>([ItemStatus.New]);
const NO_DUE_RANK = Number.POSITIVE_INFINITY;
const BUSINESS_TIME_ZONE = "America/Los_Angeles";
const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const businessDayFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export type OnDeckTransition = {
  id: string;
  fromStatus: ItemStatus;
  fromPrevStatus: ItemStatus | null;
  toStatus: ItemStatus;
  toPrevStatus: ItemStatus | null;
};

export type OnDeckReconciliationRepository = {
  listCandidates(): Promise<Item[]>;
  applyTransition(transition: OnDeckTransition): Promise<boolean>;
};

function dateKeyTimestamp(key: string): number | null {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return timestamp;
}

function businessDayKey(now: Date): string {
  const parts = businessDayFormatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

function dueDelta(item: Item, now: Date): number | null {
  if (!item.dueDate) return null;
  const dueTimestamp = dateKeyTimestamp(item.dueDate);
  const todayTimestamp = dateKeyTimestamp(businessDayKey(now));
  if (dueTimestamp === null || todayTimestamp === null) return null;
  return Math.round((dueTimestamp - todayTimestamp) / MS_PER_DAY);
}

export function planOnDeckTransitions(
  items: Item[],
  now: Date
): OnDeckTransition[] {
  const liveItems = items.filter((item) => !item.deleted);
  const selfHealIds = new Set<string>();

  for (const item of liveItems) {
    if (
      item.status === ItemStatus.OnDeck &&
      item.prevStatus &&
      !PROMOTABLE_STATUSES.has(item.prevStatus)
    ) {
      selfHealIds.add(item.id);
    }
  }

  const pool = liveItems.filter((item) => {
    if (selfHealIds.has(item.id) || item.onHold) return false;
    return item.status === ItemStatus.New || item.status === ItemStatus.OnDeck;
  });

  const rankOf = (item: Item): number =>
    dueDelta(item, now) ?? NO_DUE_RANK;
  const byUrgency = (left: Item, right: Item): number => {
    const leftRank = rankOf(left);
    const rightRank = rankOf(right);
    if (leftRank !== rightRank) return leftRank < rightRank ? -1 : 1;
    return left.id.localeCompare(right.id);
  };

  const wantedIds = new Set<string>();
  for (const item of pool) {
    const delta = dueDelta(item, now);
    const isUrgent =
      delta !== null && isWithinDueBadgeWarningWindow(delta);
    const isManual = item.status === ItemStatus.OnDeck && !item.prevStatus;
    if (isUrgent || isManual) wantedIds.add(item.id);
  }

  let target = pool.filter((item) => wantedIds.has(item.id));
  if (target.length < ON_DECK_MIN_COUNT) {
    const fillers = pool
      .filter(
        (item) =>
          !wantedIds.has(item.id) && dueDelta(item, now) !== null
      )
      .sort(byUrgency);
    for (const item of fillers) {
      if (target.length >= ON_DECK_MIN_COUNT) break;
      target.push(item);
    }
  }

  if (target.length > ON_DECK_MAX_COUNT) {
    target = [...target].sort(byUrgency).slice(0, ON_DECK_MAX_COUNT);
  }

  const targetIds = new Set(target.map((item) => item.id));
  const transitions: OnDeckTransition[] = [];

  for (const item of liveItems) {
    if (item.onHold) continue;

    const base = {
      id: item.id,
      fromStatus: item.status,
      fromPrevStatus: item.prevStatus ?? null,
    };

    if (selfHealIds.has(item.id)) {
      transitions.push({
        ...base,
        toStatus: item.prevStatus!,
        toPrevStatus: null,
      });
    } else if (
      item.status === ItemStatus.New &&
      targetIds.has(item.id)
    ) {
      transitions.push({
        ...base,
        toStatus: ItemStatus.OnDeck,
        toPrevStatus: ItemStatus.New,
      });
    } else if (
      item.status === ItemStatus.OnDeck &&
      !targetIds.has(item.id)
    ) {
      transitions.push({
        ...base,
        toStatus: item.prevStatus ?? ItemStatus.New,
        toPrevStatus: null,
      });
    }
  }

  return transitions;
}

export async function reconcileOnDeck(
  repository: OnDeckReconciliationRepository,
  now: Date = new Date()
): Promise<{ matchedCount: number; modifiedCount: number }> {
  const transitions = planOnDeckTransitions(
    await repository.listCandidates(),
    now
  );
  const applied = await Promise.all(
    transitions.map((transition) => repository.applyTransition(transition))
  );

  return {
    matchedCount: transitions.length,
    modifiedCount: applied.filter(Boolean).length,
  };
}
