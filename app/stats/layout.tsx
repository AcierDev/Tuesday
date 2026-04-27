"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useMemo } from "react";

import { laDayKey } from "@/lib/debt-metrics";
import {
  buildGluedEvents,
  computeHealthScore,
} from "@/lib/production-metrics";
import { useActivities, useAllItems } from "@/lib/stats-shared";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📊 STATS SECTIONS — add new sub-pages here                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
const SECTIONS = [
  { group: "Production", items: [
    { href: "/stats/glued", label: "Glued" },
  ]},
  { group: "Snapshot", items: [
    { href: "/stats/overview", label: "Overview" },
    { href: "/stats/today", label: "Today" },
  ]},
  { group: "Operational", items: [
    { href: "/stats/debt", label: "Time Debt" },
    { href: "/stats/backlog", label: "Backlog" },
    { href: "/stats/wip", label: "WIP & Aging" },
    { href: "/stats/bottlenecks", label: "Bottlenecks" },
    { href: "/stats/anomalies", label: "Anomalies" },
  ]},
  { group: "Throughput", items: [
    { href: "/stats/throughput", label: "Throughput" },
    { href: "/stats/lead-time", label: "Lead Time" },
    { href: "/stats/on-time", label: "On-Time" },
    { href: "/stats/calendar", label: "Activity Calendar" },
    { href: "/stats/day-patterns", label: "Day Patterns" },
    { href: "/stats/year-over-year", label: "Year-over-Year" },
  ]},
  { group: "Forward", items: [
    { href: "/stats/forecast", label: "Forecast" },
    { href: "/stats/goals", label: "Goals" },
    { href: "/stats/records", label: "Records" },
  ]},
  { group: "Shipping", items: [
    { href: "/stats/shipping", label: "Shipping Spend" },
    { href: "/stats/delivery", label: "Delivery Speed" },
    { href: "/stats/map", label: "Map" },
  ]},
  { group: "Catalog", items: [
    { href: "/stats/mix", label: "Mix" },
    { href: "/stats/trending", label: "Trending Designs" },
  ]},
  { group: "History", items: [
    { href: "/stats/activity", label: "Activity Feed" },
    { href: "/stats/quality", label: "Quality" },
  ]},
] as const;

export default function StatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen px-6 py-8 lg:px-10 lg:py-10 text-slate-100">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/orders"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white transition mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to orders
        </Link>

        <h1 className="heading-page mb-6">Stats</h1>

        <div className="flex gap-8">
          <nav className="w-48 shrink-0 flex flex-col gap-4">
            <HealthBadge active={pathname === "/stats/health"} />
            <GluedTodayBadge active={pathname === "/stats/glued"} />
            {SECTIONS.map((group) => (
              <div key={group.group} className="flex flex-col gap-0.5">
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {group.group}
                </div>
                {group.items.map((section) => {
                  const active =
                    pathname === section.href ||
                    pathname?.startsWith(`${section.href}/`);
                  return (
                    <Link
                      key={section.href}
                      href={section.href}
                      className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-lg transition",
                        active
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      {section.label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <main className="flex-1 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ❤️ HEALTH BADGE — live health score in the sidebar                    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const HEALTH_GOOD_THRESHOLD = 85;
const HEALTH_BAD_THRESHOLD = 60;

function HealthBadge({ active }: { active: boolean }) {
  const { items, loading } = useAllItems();
  const score = useMemo(
    () => (items ? computeHealthScore(items).total : null),
    [items]
  );

  const tone =
    score === null
      ? "neutral"
      : score >= HEALTH_GOOD_THRESHOLD
        ? "good"
        : score < HEALTH_BAD_THRESHOLD
          ? "bad"
          : "neutral";

  return (
    <Link
      href="/stats/health"
      className={cn(
        "block px-4 py-3 rounded-xl border transition",
        active
          ? "bg-white/10 border-white/20"
          : "bg-white/5 border-white/10 hover:bg-white/10"
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Health
      </div>
      <div
        className={cn(
          "mt-0.5 text-4xl font-bold tabular-nums leading-none",
          tone === "good" && "text-emerald-400",
          tone === "bad" && "text-red-400",
          tone === "neutral" && "text-white"
        )}
      >
        {score !== null ? score : loading ? "…" : "—"}
        <span className="ml-1 text-base font-medium text-slate-400">/100</span>
      </div>
    </Link>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧱 GLUED TODAY BADGE — live count in the sidebar                     ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

function GluedTodayBadge({ active }: { active: boolean }) {
  const { items, loading: itemsLoading } = useAllItems();
  const { activities, loading: actLoading } = useActivities();

  const todayStats = useMemo(() => {
    if (!items || !activities) return null;
    const today = laDayKey();
    const events = buildGluedEvents(activities, items).filter(
      (e) => e.dayKey === today
    );
    const squares = events.reduce((s, e) => s + e.squares, 0);
    return { squares, orders: events.length };
  }, [items, activities]);

  const loading = itemsLoading || actLoading;

  return (
    <Link
      href="/stats/glued"
      className={cn(
        "block px-4 py-3 rounded-xl border transition",
        active
          ? "bg-white/10 border-white/20"
          : "bg-white/5 border-white/10 hover:bg-white/10"
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Glued today
      </div>
      <div className="mt-0.5 text-4xl font-bold tabular-nums leading-none text-sky-400">
        {todayStats ? todayStats.squares.toLocaleString() : loading ? "…" : "—"}
        <span className="ml-1 text-base font-medium text-slate-400">sq</span>
      </div>
      {todayStats && (
        <div className="mt-1 text-[11px] text-slate-400">
          {todayStats.orders} order{todayStats.orders === 1 ? "" : "s"}
        </div>
      )}
    </Link>
  );
}
