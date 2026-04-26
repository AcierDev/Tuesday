"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useOrderStore } from "@/stores/useOrderStore";
import { ItemStatus } from "@/typings/types";
import { STATUS_COLORS } from "@/typings/constants";
import { computeTotalDebt, laDayKey } from "@/lib/debt-metrics";
import {
  buildGluedEvents,
  computeHealthScore,
  parseSquareSize,
} from "@/lib/production-metrics";
import { useActivities, useAllItems } from "@/lib/stats-shared";
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

const BACKLOG_STATUSES: ReadonlySet<string> = new Set([
  ItemStatus.New,
  ItemStatus.OnDeck,
  ItemStatus.Wip,
]);
const BACKLOG_ROUND_TO = 100;

function formatSquaresK(squares: number): string {
  if (squares < 1000) return squares.toString();
  return (squares / 1000).toFixed(1) + "k";
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
              "flex flex-col items-center justify-center w-14 h-[53px] rounded-lg px-1 select-none glass-surface transition-transform duration-200 ease-out hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 cursor-pointer",
              `text-${color} dark:text-${color}`
            )}
            title={`${status}: ${count}`}
          >
            <span className="text-base font-bold leading-none">{count}</span>
            <span className="mt-0.5 w-full truncate text-center text-[8px] font-medium uppercase tracking-wide opacity-80">
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

  const healthScore = useMemo(
    () => (allItems ? computeHealthScore(allItems).total : null),
    [allItems]
  );

  const gluedToday = useMemo(() => {
    if (!allItems || !activities) return null;
    const today = laDayKey();
    const events = buildGluedEvents(activities, allItems).filter(
      (e) => e.dayKey === today
    );
    const squares = events.reduce((s, e) => s + e.squares, 0);
    return { squares, orders: events.length };
  }, [allItems, activities]);

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
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-1 py-2 flex flex-col items-center gap-1.5">
      <Link
        href="/stats/glued"
        className={cn(
          "flex flex-col items-center justify-center w-14 h-14 rounded-xl px-1 py-1 select-none glass-surface cursor-pointer transition hover:scale-[1.04] hover:border-white/30",
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
        <span className="mt-0.5 text-base font-bold leading-none tabular-nums">
          {gluedToday ? gluedToday.squares.toLocaleString() : "—"}
        </span>
        <span className="text-[7px] font-medium uppercase tracking-wide opacity-60">
          today
        </span>
      </Link>
      <Link
        href="/orders"
        className={cn(
          "flex flex-col items-center justify-center w-14 h-14 rounded-xl px-1 py-1 select-none glass-surface cursor-pointer transition hover:scale-[1.04] hover:border-white/30",
          backlogSquares && backlogSquares > 0
            ? "text-sky-500 dark:text-sky-400"
            : "text-slate-400"
        )}
        title={
          backlogSquares === null
            ? "Backlog squares loading…"
            : `Backlog: ~${backlogSquares.toLocaleString()} squares across New / On Deck / WIP`
        }
      >
        <span className="text-[8px] font-medium uppercase tracking-wide opacity-80">
          Backlog
        </span>
        <span className="mt-0.5 text-base font-bold leading-none tabular-nums">
          {backlogSquares === null ? "—" : formatSquaresK(backlogSquares)}
        </span>
        <span className="text-[7px] font-medium uppercase tracking-wide opacity-60">
          squares
        </span>
      </Link>
      <Link
        href="/stats/debt"
        className={cn(
          "flex flex-col items-center justify-center w-14 h-20 rounded-xl px-1 py-1 select-none glass-surface cursor-pointer transition hover:scale-[1.04] hover:border-white/30",
          totalDebt > 0
            ? "text-red-500 dark:text-red-400"
            : "text-emerald-500 dark:text-emerald-400"
        )}
        title={`Total overdue debt: ${totalDebt} day${totalDebt === 1 ? "" : "s"} — click for details`}
      >
        <span className="text-[8px] font-medium uppercase tracking-wide opacity-80">
          Time Debt
        </span>
        <span className="mt-0.5 text-base font-bold leading-none tabular-nums">
          {totalDebt > 0 ? `−${totalDebt}` : "0"}
        </span>
        <span className="text-[7px] font-medium uppercase tracking-wide opacity-60">
          days
        </span>
        <MiniSparkline
          data={debtHistory}
          width={44}
          height={12}
          className="mt-1 opacity-70"
        />
      </Link>
      <Link
        href="/stats/health"
        className={cn(
          "flex flex-col items-center justify-center w-14 h-20 rounded-xl px-1 py-1 select-none glass-surface cursor-pointer transition hover:scale-[1.04] hover:border-white/30",
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
        <span className="mt-0.5 text-base font-bold leading-none tabular-nums">
          {healthScore ?? "—"}
        </span>
        <span className="text-[7px] font-medium uppercase tracking-wide opacity-60">
          /100
        </span>
        <MiniSparkline
          data={debtHistory.map((d) => -d)}
          width={44}
          height={12}
          className="mt-1 opacity-70"
        />
      </Link>
    </div>
  );
}
