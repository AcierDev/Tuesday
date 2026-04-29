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

export function StatsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="w-48 shrink-0 flex flex-col gap-4">
      <HealthBadge active={pathname === "/stats/health"} />
      <GluedTodayBadge active={pathname === "/stats/glued"} />
      {SECTIONS.map((group) => (
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
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition",
                  active
                    ? "bg-white/10 text-white"
                    : "text-slate-200 hover:text-white hover:bg-white/5"
                )}
              >
                {section.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
