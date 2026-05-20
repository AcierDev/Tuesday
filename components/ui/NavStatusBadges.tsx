"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, RotateCcw, Truck, X } from "lucide-react";

import { useOrderStore } from "@/stores/useOrderStore";
import { ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import { computeTotalDebt, laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import {
  computeFedExPickupStatus,
  getLADateKey,
  type FedExPickupStatus,
} from "@/lib/fedex-pickup";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  bucketGluedSquaresByDay,
  buildGluedEvents,
  buildScheduledDayByItemId,
  computeHealthScore,
  parseSquareSize,
  RECENCY_WEIGHTED_FORECAST,
  summarizeRecencyWeighted,
} from "@/lib/production-metrics";
import {
  invalidateStatsCaches,
  useActivities,
  useAllItems,
} from "@/lib/stats-shared";
import { useWeeklyScheduleStore } from "@/stores/useWeeklyScheduleStore";
import { MiniSparkline } from "@/components/orders/MiniSparkline";
import { cn } from "@/utils/functions";

const STATUS_SHORT_LABELS: Partial<Record<ItemStatus, string>> = {
  [ItemStatus.Packaging]: "Pack",
  [ItemStatus.At_The_Door]: "Door",
};

const SECTION_COUNTER_ORDER: ItemStatus[] = [
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
  ItemStatus.Packaging,
  ItemStatus.At_The_Door,
];

const HEALTH_GOOD_THRESHOLD = 85;
const HEALTH_BAD_THRESHOLD = 60;
const DEBT_HISTORY_DAYS = 30;
const DEBT_GREEN_MAX = 5;
const DEBT_YELLOW_MAX = 15;

const BACKLOG_STATUSES: ReadonlySet<string> = new Set([
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
]);
const BACKLOG_ROUND_TO = 100;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔮 FORECAST DAILY LOCK — held stable until 00:05 LA each day          ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const STABLE_FORECAST_STORAGE_KEY = "nav-forecast-stable-v1";
const FORECAST_REFRESH_OFFSET_MIN = 5;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Day key (YYYY-MM-DD, LA-local) that owns the current forecast value. The
// boundary is 00:05 LA, so between 00:00 and 00:05 we still report yesterday.
function getForecastDayKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const today = laDayKey(now);
  if (hour === 0 && minute < FORECAST_REFRESH_OFFSET_MIN) {
    return shiftDayKey(today, -1);
  }
  return today;
}

function msUntilNextForecastRefresh(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  const sinceMidnightMs =
    (get("hour") * 3600 + get("minute") * 60 + get("second")) * 1000;
  const offsetMs = FORECAST_REFRESH_OFFSET_MIN * 60_000;
  if (sinceMidnightMs < offsetMs) return offsetMs - sinceMidnightMs;
  return MS_PER_DAY - sinceMidnightMs + offsetMs;
}

function formatSquaresK(squares: number): string {
  if (squares < 1000) return squares.toString();
  return (squares / 1000).toFixed(1) + "k";
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚚 FEDEX PICKUP BADGE                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const FEDEX_PICKUP_POLL_MS = 60_000;
const FEDEX_PICKUP_OVERRIDE_STORAGE_KEY = "fedex-pickup-override-v1";

type FedExPickupOverrideAction = "yes" | "reset";
type FedExPickupOverride = {
  dayKey: string;
  action: FedExPickupOverrideAction;
};

function formatPickupTime(purchasedAt: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(purchasedAt));
}

function describePickupStatus(
  status: FedExPickupStatus,
  override: FedExPickupOverride | null
): string {
  const suffix =
    override?.action === "yes"
      ? " (manual override)"
      : override?.action === "reset"
        ? " (today cleared manually)"
        : "";
  if (status.kind === "none") {
    return `No FedEx label currently awaiting pickup.${suffix}`;
  }
  if (status.kind === "today" && status.purchasedAt === 0) {
    return `FedEx pickup TODAY${suffix}`;
  }
  const stamped = formatPickupTime(status.purchasedAt);
  if (status.kind === "today") {
    return `FedEx pickup TODAY (earliest pending label purchased ${stamped} PT).${suffix}`;
  }
  return `FedEx pickup ${status.pickupWeekday.toUpperCase()} (earliest pending label purchased ${stamped} PT).${suffix}`;
}

function loadFedExPickupOverride(now: Date): FedExPickupOverride | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FEDEX_PICKUP_OVERRIDE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FedExPickupOverride>;
    const todayKey = getLADateKey(now.getTime());
    if (
      parsed.dayKey !== todayKey ||
      (parsed.action !== "yes" && parsed.action !== "reset")
    ) {
      window.localStorage.removeItem(FEDEX_PICKUP_OVERRIDE_STORAGE_KEY);
      return null;
    }
    return { dayKey: parsed.dayKey, action: parsed.action };
  } catch {
    return null;
  }
}

function applyFedExPickupOverride(
  purchasedAts: readonly number[],
  override: FedExPickupOverride | null,
  now: Date
): FedExPickupStatus {
  if (override?.action === "yes") {
    return {
      kind: "today",
      purchasedAt: 0,
      pickupDateKey: getLADateKey(now.getTime()),
    };
  }
  if (override?.action === "reset") {
    const filtered = purchasedAts.filter((ts) => {
      const single = computeFedExPickupStatus([ts], now);
      return single.kind !== "today";
    });
    return computeFedExPickupStatus(filtered, now);
  }
  return computeFedExPickupStatus(purchasedAts, now);
}

export function FedExPickupBadge() {
  const [purchasedAts, setPurchasedAts] = useState<number[]>([]);
  const [now, setNow] = useState<Date>(() => new Date());
  const [override, setOverride] = useState<FedExPickupOverride | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);

  useEffect(() => {
    setOverride(loadFedExPickupOverride(new Date()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/shipping/fedex-pickup-status", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { purchasedAts?: number[] };
        if (!cancelled) {
          setPurchasedAts(data.purchasedAts ?? []);
          const fresh = new Date();
          setNow(fresh);
          setOverride(loadFedExPickupOverride(fresh));
        }
      } catch (err) {
        console.error("Failed to load FedEx pickup status", err);
      }
    }
    load();
    const interval = setInterval(load, FEDEX_PICKUP_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const status = useMemo(
    () => applyFedExPickupOverride(purchasedAts, override, now),
    [purchasedAts, override, now]
  );

  const persistOverride = useCallback(
    (action: FedExPickupOverrideAction) => {
      const fresh = new Date();
      const next: FedExPickupOverride = {
        dayKey: getLADateKey(fresh.getTime()),
        action,
      };
      try {
        window.localStorage.setItem(
          FEDEX_PICKUP_OVERRIDE_STORAGE_KEY,
          JSON.stringify(next)
        );
      } catch {
        // storage unavailable; keep in-memory state
      }
      setOverride(next);
      setNow(fresh);
      setPopoverOpen(false);
    },
    []
  );

  const clearOverride = useCallback(() => {
    try {
      window.localStorage.removeItem(FEDEX_PICKUP_OVERRIDE_STORAGE_KEY);
    } catch {
      // ignore
    }
    setOverride(null);
    setNow(new Date());
    setPopoverOpen(false);
  }, []);

  const colorClass =
    status.kind === "today" || status.kind === "later"
      ? "text-emerald-500 dark:text-emerald-400"
      : "text-slate-400";

  const valueLabel =
    status.kind === "today"
      ? "TODAY"
      : status.kind === "later"
        ? status.pickupWeekday.toUpperCase()
        : "—";

  return (
    <div className="px-1 pt-2 flex flex-col items-center">
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            title={describePickupStatus(status, override)}
            className={cn(
              "relative flex flex-col items-center justify-center w-16 h-16 rounded-xl px-1 py-1 select-none glass-surface transition-transform duration-200 ease-out hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer",
              colorClass
            )}
          >
            {override && (
              <span
                aria-hidden
                className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-amber-400"
              />
            )}
            <span className="text-[8px] font-medium uppercase tracking-wide opacity-80">
              FedEx
            </span>
            <Truck className="mt-0.5 h-4 w-4" strokeWidth={2.5} />
            <span className="mt-0.5 text-[11px] font-bold leading-none tabular-nums">
              {valueLabel}
            </span>
            <span className="text-[7px] font-medium uppercase tracking-wide opacity-60">
              pickup
            </span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          className="w-60 p-2 space-y-1"
        >
          <div className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide opacity-70">
            FedEx pickup today
          </div>
          <button
            type="button"
            onClick={() => persistOverride("yes")}
            className={cn(
              "w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              override?.action === "yes" &&
                "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            )}
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
            <span>Yes, pickup today</span>
          </button>
          <button
            type="button"
            onClick={() => persistOverride("reset")}
            className={cn(
              "w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              override?.action === "reset" &&
                "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            )}
          >
            <RotateCcw className="h-4 w-4" strokeWidth={2.5} />
            <span>Reset for today</span>
          </button>
          {override && (
            <button
              type="button"
              onClick={clearOverride}
              className="w-full flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 opacity-80"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
              <span>Clear manual override</span>
            </button>
          )}
          <div className="px-2 pt-1 text-[10px] leading-snug opacity-60">
            Use “Yes” when you bought a FedEx label outside the app. Override
            auto-clears at LA midnight.
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function NavSectionCounters() {
  const items = useOrderStore((state) => state.items);
  const pathname = usePathname();
  const router = useRouter();

  const statusCounts = useMemo(() => {
    const counts = {} as Record<ItemStatus, number>;
    for (const status of Object.values(ItemStatus)) counts[status] = 0;
    for (const item of items || []) {
      if (counts[item.status] !== undefined) counts[item.status] += 1;
    }
    return counts;
  }, [items]);

  const handleStatusClick = (status: ItemStatus) => {
    const sectionId = `section-${status.toLowerCase().replace(/\s+/g, "-")}`;
    if (pathname === "/orders") {
      document
        .getElementById(sectionId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      router.push(`/orders#${sectionId}`);
    }
  };

  return (
    <div className="px-1 py-2 flex flex-col items-center gap-1.5">
      {SECTION_COUNTER_ORDER.map((status) => {
        const color = STATUS_COLORS[status] || "gray-400";
        const count = statusCounts[status] ?? 0;
        const label = STATUS_SHORT_LABELS[status] ?? status;
        return (
          <button
            key={status}
            type="button"
            onClick={() => handleStatusClick(status)}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-14 rounded-lg px-1 select-none glass-surface transition-transform duration-200 ease-out hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer",
              `text-${color} dark:text-${color}`
            )}
            title={`${status}: ${count}`}
          >
            <span className="text-[18.4px] font-bold leading-none">{count}</span>
            <span className="mt-0.5 w-full truncate text-center text-[9.2px] font-medium uppercase tracking-wide opacity-80">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function NavMetricsBadges() {
  const items = useOrderStore((state) => state.items);

  const totalDebt = useMemo(() => {
    if (!items) return 0;
    const active = items.filter(
      (i) => i.status !== ItemStatus.Done && i.status !== ItemStatus.Hidden
    );
    return computeTotalDebt(active);
  }, [items]);

  const { items: allItems } = useAllItems();
  const { activities } = useActivities();
  const schedules = useWeeklyScheduleStore((s) => s.schedules);

  const healthScore = useMemo(
    () => (allItems ? computeHealthScore(allItems).total : null),
    [allItems]
  );

  const gluedStats = useMemo(() => {
    if (!allItems || !activities) return null;
    const today = laDayKey();
    const scheduledDay = buildScheduledDayByItemId(schedules);
    const events = buildGluedEvents(activities, allItems, scheduledDay);

    const todayEvents = events.filter((e) => e.dayKey === today);
    const todaySquares = todayEvents.reduce((s, e) => s + e.squares, 0);

    const forecastStart = shiftDayKey(
      today,
      -(RECENCY_WEIGHTED_FORECAST.lookbackDays - 1)
    );
    const buckets = bucketGluedSquaresByDay(events, forecastStart, today);
    const forecast = summarizeRecencyWeighted(
      buckets,
      RECENCY_WEIGHTED_FORECAST
    );

    return {
      today: { squares: todaySquares, orders: todayEvents.length },
      forecastPerDay: forecast.weightedAvgActive,
    };
  }, [allItems, activities, schedules]);

  const gluedToday = gluedStats?.today ?? null;
  const liveForecastPerDay = gluedStats?.forecastPerDay ?? null;

  // Forecast is locked to a per-day snapshot that rotates at 00:05 LA. We
  // capture the live value the first time it loads each day, persist it,
  // and ignore subsequent intra-day changes.
  const [stableForecast, setStableForecast] = useState<number | null>(null);

  useEffect(() => {
    if (liveForecastPerDay === null) return;
    const today = getForecastDayKey();
    try {
      const raw = window.localStorage.getItem(STABLE_FORECAST_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { dayKey: string; value: number };
        if (parsed.dayKey === today && typeof parsed.value === "number") {
          setStableForecast(parsed.value);
          return;
        }
      }
    } catch {
      // ignore corrupted cache
    }
    const value = Math.round(liveForecastPerDay);
    try {
      window.localStorage.setItem(
        STABLE_FORECAST_STORAGE_KEY,
        JSON.stringify({ dayKey: today, value })
      );
    } catch {
      // storage unavailable; fall through with in-memory value
    }
    setStableForecast(value);
  }, [liveForecastPerDay]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      timer = setTimeout(() => {
        try {
          window.localStorage.removeItem(STABLE_FORECAST_STORAGE_KEY);
        } catch {
          // ignore
        }
        setStableForecast(null);
        invalidateStatsCaches();
        schedule();
      }, msUntilNextForecastRefresh());
    }
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  const backlogSquares = useMemo(() => {
    if (!items) return null;
    let total = 0;
    for (const item of items) {
      if (!BACKLOG_STATUSES.has(item.status)) continue;
      const parsed = parseSquareSize(item.size);
      if (!parsed) continue;
      total += parsed.squares;
    }
    return Math.round(total / BACKLOG_ROUND_TO) * BACKLOG_ROUND_TO;
  }, [items]);

  const [debtHistory, setDebtHistory] = useState<number[]>([]);
  const [backlogHistory, setBacklogHistory] = useState<number[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/debt-snapshots?days=${DEBT_HISTORY_DAYS}`
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          series: { date: string; totalDebt: number }[];
        };
        if (cancelled) return;
        setDebtHistory(json.series.map((p) => p.totalDebt));
      } catch (err) {
        console.error("Failed to load debt snapshots", err);
      }
    })();
    (async () => {
      try {
        const res = await fetch(
          `/api/backlog-snapshots?days=${DEBT_HISTORY_DAYS}`
        );
        if (!res.ok) return;
        const json = (await res.json()) as {
          series: { date: string; squares: number }[];
        };
        if (cancelled) return;
        setBacklogHistory(json.series.map((p) => p.squares));
      } catch (err) {
        console.error("Failed to load backlog snapshots", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-1 py-2 flex flex-col items-center gap-1.5">
      <Link
        href="/stats/health"
        className={cn(
          "flex flex-col items-center justify-center w-16 h-20 rounded-xl px-1 py-1 select-none glass-surface cursor-pointer transition hover:scale-[1.04] hover:border-white/30",
          healthScore === null
            ? "text-slate-400"
            : healthScore >= HEALTH_GOOD_THRESHOLD
              ? "text-emerald-500 dark:text-emerald-400"
              : healthScore < HEALTH_BAD_THRESHOLD
                ? "text-red-500 dark:text-red-400"
                : "text-amber-500 dark:text-amber-400"
        )}
        title={
          healthScore === null
            ? "Health score loading…"
            : `Health score: ${healthScore}/100 — click for breakdown`
        }
      >
        <span className="text-[8px] font-medium uppercase tracking-wide opacity-80">
          Health
        </span>
        <span className="mt-0.5 text-lg font-bold leading-none tabular-nums">
          {healthScore ?? "—"}
        </span>
        <span className="text-[7px] font-medium uppercase tracking-wide opacity-60">
          /100
        </span>
        <MiniSparkline
          data={debtHistory.map((d) => -d)}
          width={52}
          height={13}
          className="mt-1 opacity-70"
        />
      </Link>
      <Link
        href="/stats/debt"
        className={cn(
          "flex flex-col items-center justify-center w-16 h-20 rounded-xl px-1 py-1 select-none glass-surface cursor-pointer transition hover:scale-[1.04] hover:border-white/30",
          totalDebt <= DEBT_GREEN_MAX
            ? "text-emerald-500 dark:text-emerald-400"
            : totalDebt <= DEBT_YELLOW_MAX
              ? "text-amber-500 dark:text-amber-400"
              : "text-red-500 dark:text-red-400"
        )}
        title={`Total overdue debt: ${totalDebt} day${totalDebt === 1 ? "" : "s"} — click for details`}
      >
        <span className="text-[8px] font-medium uppercase tracking-wide opacity-80">
          Time Debt
        </span>
        <span className="mt-0.5 text-lg font-bold leading-none tabular-nums">
          {totalDebt > 0 ? `−${totalDebt}` : "0"}
        </span>
        <span className="text-[7px] font-medium uppercase tracking-wide opacity-60">
          days
        </span>
        <MiniSparkline
          data={debtHistory}
          width={52}
          height={13}
          className="mt-1 opacity-70"
        />
      </Link>
      <Link
        href="/stats/backlog"
        className={cn(
          "flex flex-col items-center justify-center w-16 h-20 rounded-xl px-1 py-1 select-none glass-surface cursor-pointer transition hover:scale-[1.04] hover:border-white/30",
          backlogSquares && backlogSquares > 0
            ? "text-sky-500 dark:text-sky-400"
            : "text-slate-400"
        )}
        title={
          backlogSquares === null
            ? "Backlog squares loading…"
            : `Backlog: ~${backlogSquares.toLocaleString()} squares across New / On Deck / WIP — click for details`
        }
      >
        <span className="text-[8px] font-medium uppercase tracking-wide opacity-80">
          Backlog
        </span>
        <span className="mt-0.5 text-lg font-bold leading-none tabular-nums">
          {backlogSquares === null ? "—" : formatSquaresK(backlogSquares)}
        </span>
        <span className="text-[7px] font-medium uppercase tracking-wide opacity-60">
          squares
        </span>
        <MiniSparkline
          data={backlogHistory}
          width={52}
          height={13}
          className="mt-1 opacity-70"
        />
      </Link>
      <Link
        href="/stats/glued"
        className={cn(
          "flex flex-col items-center justify-center w-16 h-14 rounded-xl px-1 py-1.5 select-none glass-surface cursor-pointer transition hover:scale-[1.04] hover:border-white/30",
          stableForecast && stableForecast > 0
            ? "text-violet-500 dark:text-violet-400"
            : "text-slate-400"
        )}
        title={
          stableForecast === null
            ? "Forecast loading…"
            : `Recency-weighted glue pace: ${stableForecast.toLocaleString()} sq / working day (last ${RECENCY_WEIGHTED_FORECAST.lookbackDays}d, recent ${RECENCY_WEIGHTED_FORECAST.recentWindowDays}d weighted ${RECENCY_WEIGHTED_FORECAST.recentWeight}×). Locked daily; refreshes 00:05 LA.`
        }
      >
        <span className="text-[8px] font-medium uppercase tracking-wide opacity-80">
          Forecast
        </span>
        <span className="mt-0.5 text-lg font-bold leading-none tabular-nums">
          {stableForecast === null || stableForecast === 0
            ? "—"
            : stableForecast.toLocaleString()}
        </span>
        <span className="text-[7px] font-medium uppercase tracking-wide opacity-60">
          sq/day
        </span>
      </Link>
      <Link
        href="/stats/glued"
        className={cn(
          "flex flex-col items-center justify-center w-16 h-14 rounded-xl px-1 py-1 select-none glass-surface cursor-pointer transition hover:scale-[1.04] hover:border-white/30",
          gluedToday && gluedToday.squares > 0
            ? "text-emerald-500 dark:text-emerald-400"
            : "text-slate-400"
        )}
        title={
          gluedToday === null
            ? "Glued today loading…"
            : `Glued today: ${gluedToday.squares} square${gluedToday.squares === 1 ? "" : "s"} across ${gluedToday.orders} order${gluedToday.orders === 1 ? "" : "s"}`
        }
      >
        <span className="text-[8px] font-medium uppercase tracking-wide opacity-80">
          Glued
        </span>
        <span className="mt-0.5 text-lg font-bold leading-none tabular-nums">
          {!gluedToday || gluedToday.squares === 0
            ? "—"
            : gluedToday.squares.toLocaleString()}
        </span>
        <span className="text-[7px] font-medium uppercase tracking-wide opacity-60">
          today
        </span>
      </Link>
    </div>
  );
}
