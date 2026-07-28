"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PaintbrushVertical } from "lucide-react";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪣 SQUARES-GLUED-TODAY BADGE (mobile)                                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝
// Small pill shown to the left of the mobile page toggle. Pulls today's
// glued-squares count from the server-computed stats route — that route
// returns only today's bucket and is CDN-cached, so it's far cheaper than
// the client useActivities/useAllItems hooks (which ship ~5000 activities).

// days=1 → the route returns a single bucket for today (LA-local).
const GLUED_TODAY_URL = "/api/stats/glued?days=1";

type GluedBucket = { date: string; value: number };

export function MobileGluedTodayBadge() {
  const [squares, setSquares] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(GLUED_TODAY_URL);
        if (!res.ok) return;
        const json = (await res.json()) as { buckets?: GluedBucket[] };
        // days=1 yields exactly one bucket; fall back to last just in case.
        const today = json.buckets?.[json.buckets.length - 1]?.value ?? 0;
        if (!cancelled) setSquares(today);
      } catch {
        // Leave the last known value on transient failures.
      }
    };

    load();
    // Refresh when the tab regains focus so the count stays current across a
    // work session without polling.
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <Link
      href="/stats/glued"
      aria-label={`${squares ?? 0} squares glued today`}
      className="flex h-10 items-center gap-1.5 rounded-full bg-gray-950/85 px-3 text-white shadow-lg shadow-black/30 ring-1 ring-white/15 backdrop-blur-md transition-transform active:scale-95"
    >
      <PaintbrushVertical className="h-4 w-4 text-sky-400" />
      <span className="text-sm font-semibold tabular-nums text-sky-400">
        {squares === null ? "…" : squares.toLocaleString()}
      </span>
      <span className="text-[11px] font-medium text-slate-400">sq</span>
    </Link>
  );
}
