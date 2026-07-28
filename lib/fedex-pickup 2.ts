//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚚 FEDEX AUTO-PICKUP RULES                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
//
// FedEx schedules an automatic pickup based on when the label was purchased
// in *Los Angeles* time:
//   - Weekday before 1:02 PM PT  → picked up SAME day
//   - Weekday after 1:02 PM PT   → picked up NEXT business day
//   - Weekend                    → picked up Monday
//
// The 2-minute buffer past 1:00 PM keeps a label clicked at "1:01 PM" from
// being demoted to next-day pickup. FedEx comes at 4:00 PM PT; the 1 PM–4 PM
// gap is a 3-hour memory-aid grace window during which any label uploaded
// today is shown as "today's pickup" regardless of the 1:02 PM cutoff. At
// 4 PM PT we recalculate: today's labels are dropped (truck has come) and any
// 1 PM–4 PM uploads switch over to next-business-day pickup.

const LA_TIMEZONE = "America/Los_Angeles";
const PICKUP_CUTOFF_HOUR = 13;
const PICKUP_CUTOFF_BUFFER_MINUTES = 2;
const PICKUP_TIME_HOUR_LA = 16;

type LAParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: string;
};

function getLAParts(date: Date): LAParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: LA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hourRaw = get("hour");
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: hourRaw === "24" ? 0 : Number(hourRaw),
    minute: Number(get("minute")),
    weekday: get("weekday"),
  };
}

function dateKeyFromLAParts(p: LAParts): string {
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function getLADateKey(timestamp: number): string {
  return dateKeyFromLAParts(getLAParts(new Date(timestamp)));
}

function isLAWeekday(weekday: string): boolean {
  return weekday !== "Sat" && weekday !== "Sun";
}

function nextWeekdayDateKey(after: Date): string {
  for (let i = 1; i <= 7; i++) {
    const probe = new Date(after.getTime() + i * 24 * 60 * 60 * 1000);
    const p = getLAParts(probe);
    if (isLAWeekday(p.weekday)) return dateKeyFromLAParts(p);
  }
  return getLADateKey(after.getTime());
}

function weekdayFromDateKey(dateKey: string): string {
  const parts = dateKey.split("-").map(Number);
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  // Noon UTC of the LA date lands solidly within the same LA calendar day for
  // any UTC offset, so weekday lookup is safe regardless of DST.
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return getLAParts(dt).weekday;
}

// LA date (YYYY-MM-DD) on which we surface the pickup for a label purchased at
// the given timestamp. By default this is FedEx's actual scheduled pickup day
// (same-day if uploaded before 1:02 PM on a weekday, otherwise next business
// day). Layered on top: a memory-aid override that shows any label uploaded
// today on a weekday as "today's pickup" right up until the 4 PM LA pickup
// time. The override falls away at 4 PM, at which point a 1 PM–4 PM upload
// switches over to its real next-business-day slot.
function computePickupDateKey(purchasedAt: number, now: Date): string {
  const purchase = getLAParts(new Date(purchasedAt));
  const purchaseDateKey = dateKeyFromLAParts(purchase);
  const nowParts = getLAParts(now);
  const todayKey = dateKeyFromLAParts(nowParts);

  if (
    purchaseDateKey === todayKey &&
    isLAWeekday(nowParts.weekday) &&
    nowParts.hour < PICKUP_TIME_HOUR_LA
  ) {
    return todayKey;
  }

  const cutoffMinutes =
    PICKUP_CUTOFF_HOUR * 60 + PICKUP_CUTOFF_BUFFER_MINUTES;
  const purchaseMinutes = purchase.hour * 60 + purchase.minute;
  if (isLAWeekday(purchase.weekday) && purchaseMinutes < cutoffMinutes) {
    return purchaseDateKey;
  }
  return nextWeekdayDateKey(new Date(purchasedAt));
}

// True once `now` is at/past 4 PM LA on the pickup day — the truck has come
// and we drop the label so the next pending pickup can take over the badge.
function hasPickupWindowClosed(pickupDateKey: string, now: Date): boolean {
  const nowParts = getLAParts(now);
  const nowDateKey = dateKeyFromLAParts(nowParts);
  if (nowDateKey > pickupDateKey) return true;
  if (nowDateKey < pickupDateKey) return false;
  return nowParts.hour >= PICKUP_TIME_HOUR_LA;
}

export type FedExPickupStatus =
  | { kind: "none" }
  | { kind: "today"; purchasedAt: number; pickupDateKey: string }
  | {
      kind: "later";
      purchasedAt: number;
      pickupWeekday: string;
      pickupDateKey: string;
    };

// Pick the next pending FedEx pickup from a list of label-purchase timestamps.
// A pickup stays pending until 4 PM LA on its scheduled day; afterward the
// label is treated as already collected.
export function computeFedExPickupStatus(
  purchasedAts: readonly number[],
  now: Date = new Date()
): FedExPickupStatus {
  const pending: { purchasedAt: number; pickupDateKey: string }[] = [];
  for (const ts of purchasedAts) {
    const pickupDateKey = computePickupDateKey(ts, now);
    if (!hasPickupWindowClosed(pickupDateKey, now)) {
      pending.push({ purchasedAt: ts, pickupDateKey });
    }
  }
  pending.sort(
    (a, b) =>
      a.pickupDateKey.localeCompare(b.pickupDateKey) ||
      a.purchasedAt - b.purchasedAt
  );
  const next = pending[0];
  if (!next) return { kind: "none" };

  const todayKey = getLADateKey(now.getTime());
  if (next.pickupDateKey === todayKey) {
    return {
      kind: "today",
      purchasedAt: next.purchasedAt,
      pickupDateKey: next.pickupDateKey,
    };
  }
  return {
    kind: "later",
    purchasedAt: next.purchasedAt,
    pickupWeekday: weekdayFromDateKey(next.pickupDateKey),
    pickupDateKey: next.pickupDateKey,
  };
}
