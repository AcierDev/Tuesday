"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/utils/functions";

import { GluedTodayBadge } from "./GluedTodayBadge";
import { HealthBadge } from "./HealthBadge";
import { SECTIONS } from "./sections";

export function StatsSidebar() {
  const pathname = usePathname();

  return (
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
  );
}
