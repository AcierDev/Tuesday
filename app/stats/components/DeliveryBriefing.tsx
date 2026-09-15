"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { laDayKey } from "@/lib/debt-metrics";
import {
  DELIVERY_BRIEFING_CONFIG, DELIVERY_SEVERITY_LABELS,
  type DeliveryBriefingResponse, type DeliverySeverity, type DeliveryBriefing as BriefingReport,
} from "@/lib/delivery-briefing";

const BRIEFING_ENDPOINT = "/api/stats/delivery-briefing";
const PERCENT_DECIMALS = 0;
const SEVERITY_STYLES: Record<DeliverySeverity, string> = {
  critical: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  behind: "border-orange-400/30 bg-orange-400/10 text-orange-200",
  watch: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  on_track: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  unknown: "border-slate-400/30 bg-slate-400/10 text-slate-200",
};

export function DeliveryBriefing({ snapshot }: { snapshot?: BriefingReport } = {}) {
  const [data, setData] = useState<DeliveryBriefingResponse | null>(null);
  const [error, setError] = useState(false);
  const [today, setToday] = useState<string | null>(null);
  const report = snapshot ?? data?.report;
  const stale = Boolean(report && today && report.date !== today);

  useEffect(() => {
    if (snapshot) return;
    // Request ownership belongs to this effect instance, including StrictMode restarts.
    let inflight = false;
    let loadedDate: string | null = null;
    const lifetime = new AbortController();
    const refresh = async () => {
      if (inflight || lifetime.signal.aborted) return;
      inflight = true;
      const request = new AbortController();
      const cancel = () => request.abort();
      lifetime.signal.addEventListener("abort", cancel);
      const timeout = setTimeout(cancel, DELIVERY_BRIEFING_CONFIG.requestTimeoutMs);
      try {
        const response = await fetch(BRIEFING_ENDPOINT, { cache: "no-store", signal: request.signal });
        if (!response.ok) throw new Error("Briefing unavailable");
        const payload = await response.json() as DeliveryBriefingResponse;
        if (!lifetime.signal.aborted) {
          loadedDate = payload.pending ? null : payload.report?.date ?? null;
          setData(payload);
          setError(false);
        }
      } catch {
        if (!lifetime.signal.aborted) setError(true);
      } finally {
        clearTimeout(timeout);
        lifetime.signal.removeEventListener("abort", cancel);
        inflight = false;
      }
    };
    const check = () => {
      const currentDay = laDayKey();
      setToday(currentDay);
      if (document.visibilityState === "visible" && loadedDate !== currentDay) void refresh();
    };
    check();
    const interval = setInterval(check, DELIVERY_BRIEFING_CONFIG.pollIntervalMs);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", check);
    return () => {
      lifetime.abort();
      clearInterval(interval);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", check);
    };
  }, [snapshot]);

  return (
    <section aria-labelledby="delivery-briefing-title" className={snapshot ? "min-w-0" : "mb-8 rounded-2xl glass-surface p-5 sm:p-6"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        {!snapshot && <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Daily delivery briefing</p>
          <h2 id="delivery-briefing-title" className="mt-2 text-xl font-semibold text-white">Are we getting orders out on time?</h2>
        </div>}
        {report && <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${SEVERITY_STYLES[report.severity]}`}>
          {stale ? "Last report: " : ""}{DELIVERY_SEVERITY_LABELS[report.severity]}
        </span>}
      </div>

      {!report && <p role="status" className="mt-4 text-sm text-slate-400">
        {error ? "The delivery briefing could not be loaded. Retrying automatically."
          : data?.pending ? "Preparing today's delivery briefing…" : "Loading daily delivery briefing…"}
      </p>}
      {report && <>
        <p className="mt-4 max-w-4xl whitespace-pre-line text-sm leading-relaxed text-slate-200">{report.summary}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <BriefingMetric href="/stats/on-time" label="Overdue now" value={report.metrics.overdue.toLocaleString()}
            detail={`of ${report.metrics.active} active items`} urgent={report.metrics.overdue > 0} />
          <BriefingMetric href="/stats/on-time" label="Oldest delay" value={`${report.metrics.oldestOverdueDays} days`}
            detail={`${report.metrics.overdueDays} total overdue days`} urgent={report.metrics.oldestOverdueDays > 0} />
          <BriefingMetric href="/production-planning" label={`Due next ${DELIVERY_BRIEFING_CONFIG.upcomingDays} days`}
            value={report.metrics.dueSoon.toLocaleString()} detail="includes today · excludes overdue" />
          <BriefingMetric href="/stats/on-time" label={`On time · prior ${DELIVERY_BRIEFING_CONFIG.historyDays} days`}
            value={report.metrics.onTimePercent === null ? "—" : `${report.metrics.onTimePercent.toFixed(PERCENT_DECIMALS)}%`}
            detail={`${report.metrics.shippedWithDueDate} dated completions${report.metrics.shippedWithDueDate < DELIVERY_BRIEFING_CONFIG.minimumShippingSample ? " · limited history" : ""}`} />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-300">
          <span>{report.overdueChange === null ? "Yesterday comparison unavailable"
            : report.overdueChange === 0 ? "Overdue count unchanged from yesterday"
              : `${Math.abs(report.overdueChange)} ${report.overdueChange > 0 ? "more" : "fewer"} overdue than yesterday`}</span>
          <span>{report.metrics.overdueReadyToShip} overdue at the door · {report.metrics.overduePackaging} in packaging</span>
          {report.metrics.missingDueDate > 0 && <span className="text-amber-200">{report.metrics.missingDueDate} active items missing valid deadlines</span>}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <p className="text-xs text-slate-400">
            {report.source === "ai" ? "AI summary" : "Calculated summary · AI unavailable"} · As of {new Date(report.recordedAt).toLocaleString("en-US", {
              timeZone: DELIVERY_BRIEFING_CONFIG.timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
            })}
          </p>
          <Link href={snapshot ? "/stats/overview" : "/production-planning"} className="text-xs font-semibold text-sky-300 hover:text-sky-200">{snapshot ? "View full stats →" : "Open production planner →"}</Link>
        </div>
      </>}
      {(stale || (error && report)) && <p role="status" className="mt-3 text-xs text-amber-200">
        {stale ? "Today's refresh is pending. Showing the last available report." : "Could not check for updates. Showing the last loaded report."}
      </p>}
      {!snapshot && <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Refreshes daily around midnight Pacific. Counts order items; shipping performance uses the date marked Done, not carrier delivery. Paused items are excluded.
      </p>}
    </section>
  );
}

function BriefingMetric({ href, label, value, detail, urgent = false }: {
  href: string; label: string; value: string; detail: string; urgent?: boolean;
}) {
  return <Link href={href} className="min-w-0 rounded-xl bg-white/5 p-3 transition hover:bg-white/10">
    <p className="text-xs text-slate-400">{label}</p>
    <p className={`mt-2 text-2xl font-semibold tabular-nums ${urgent ? "text-rose-300" : "text-white"}`}>{value}</p>
    <p className="mt-1 text-xs text-slate-400">{detail}</p>
  </Link>;
}
