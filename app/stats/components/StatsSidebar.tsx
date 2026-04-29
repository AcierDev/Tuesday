"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/utils/functions";

import { GluedTodayBadge } from "./GluedTodayBadge";
import { HealthBadge } from "./HealthBadge";
import { SECTIONS } from "./sections";

const GROUP_TONE: Record<string, string> = {
  Snapshot: "bg-fuchsia-500/15 ring-fuchsia-400/30 text-fuchsia-200",
  Operations: "bg-amber-500/15 ring-amber-400/30 text-amber-200",
  Throughput: "bg-emerald-500/15 ring-emerald-400/30 text-emerald-200",
  Trends: "bg-violet-500/15 ring-violet-400/30 text-violet-200",
  Catalog: "bg-rose-500/15 ring-rose-400/30 text-rose-200",
  Shipping: "bg-orange-500/15 ring-orange-400/30 text-orange-200",
};

// Per-group link styling — keeps each section visually anchored to its
// colored group badge via a left accent bar + tinted hover/active state.
const GROUP_LINK_TONE: Record<string, { idle: string; active: string }> = {
  Snapshot: {
    idle: "border-fuchsia-400/0 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/10 hover:text-fuchsia-100",
    active: "border-fuchsia-400/80 bg-fuchsia-500/15 text-fuchsia-100",
  },
  Operations: {
    idle: "border-amber-400/0 hover:border-amber-400/50 hover:bg-amber-500/10 hover:text-amber-100",
    active: "border-amber-400/80 bg-amber-500/15 text-amber-100",
  },
  Throughput: {
    idle: "border-emerald-400/0 hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-emerald-100",
    active: "border-emerald-400/80 bg-emerald-500/15 text-emerald-100",
  },
  Trends: {
    idle: "border-violet-400/0 hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-violet-100",
    active: "border-violet-400/80 bg-violet-500/15 text-violet-100",
  },
  Catalog: {
    idle: "border-rose-400/0 hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-rose-100",
    active: "border-rose-400/80 bg-rose-500/15 text-rose-100",
  },
  Shipping: {
    idle: "border-orange-400/0 hover:border-orange-400/50 hover:bg-orange-500/10 hover:text-orange-100",
    active: "border-orange-400/80 bg-orange-500/15 text-orange-100",
  },
};

const FALLBACK_LINK_TONE = {
  idle: "border-white/0 hover:border-white/40 hover:bg-white/5 hover:text-white",
  active: "border-white/60 bg-white/10 text-white",
};

export function StatsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-48 shrink-0 flex flex-col gap-4">
      <HealthBadge active={pathname === "/stats/health"} />
      <GluedTodayBadge active={pathname === "/stats/glued"} />
      {SECTIONS.map((group) => {
        const linkTone = GROUP_LINK_TONE[group.group] ?? FALLBACK_LINK_TONE;
        return (
          <div key={group.group} className="flex flex-col gap-0.5">
            <div
              className={cn(
                "self-start mb-1.5 px-2 py-0.5 rounded-md ring-1 ring-inset text-[10px] font-bold uppercase tracking-wider",
                GROUP_TONE[group.group] ??
                  "bg-white/10 ring-white/10 text-white/90"
              )}
            >
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
                    "px-3 py-1.5 text-sm font-medium rounded-r-lg border-l-2 transition-colors",
                    active
                      ? linkTone.active
                      : cn("text-slate-200", linkTone.idle)
                  )}
                >
                  {section.label}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
