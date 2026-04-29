"use client";

import Link from "next/link";

import { cn } from "@/utils/functions";

export function BadgeCard({
  href,
  label,
  active,
  children,
}: {
  href: string;
  label: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "block px-4 py-3 rounded-xl border transition",
        active
          ? "bg-white/10 border-white/20"
          : "bg-white/5 border-white/10 hover:bg-white/10"
      )}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      {children}
    </Link>
  );
}
