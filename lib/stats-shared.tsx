"use client";

import { useEffect, useRef, useState } from "react";

import { dayDiffKeys, laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import type { StatsSummaryView } from "@/lib/server/stats-views/summary";
import {
  DayBucket,
  GluedEvent,
  HealthBreakdownRow,
} from "@/lib/production-metrics";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/utils/functions";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Calendar-period resolvers: each takes today's LA-local YYYY-MM-DD and
// returns an absolute [start, end] window. These are NOT rolling — "Last
// month" on May 31 and "Last month" on May 1 both resolve to the full
// prior month. `dayDiffKeys` gives the day count for chart bucketing.

function firstOfMonth(yyyy_mm_dd: string): string {
  return `${yyyy_mm_dd.slice(0, 7)}-01`;
}

function quarterStartKey(yyyy_mm_dd: string): string {
  const [y, m] = yyyy_mm_dd.split("-").map(Number);
  const qStartMonth = Math.floor(((m ?? 1) - 1) / 3) * 3 + 1;
  return `${y}-${String(qStartMonth).padStart(2, "0")}-01`;
}

function resolveMonthToDate(today: string) {
  return { start: firstOfMonth(today), end: today };
}
function resolveLastMonth(today: string) {
  const lastMonthEnd = shiftDayKey(firstOfMonth(today), -1);
  return { start: firstOfMonth(lastMonthEnd), end: lastMonthEnd };
}
function resolveQuarterToDate(today: string) {
  return { start: quarterStartKey(today), end: today };
}
function resolveLastQuarter(today: string) {
  const lastQEnd = shiftDayKey(quarterStartKey(today), -1);
  return { start: quarterStartKey(lastQEnd), end: lastQEnd };
}
function resolveYearToDate(today: string) {
  return { start: `${today.slice(0, 4)}-01-01`, end: today };
}
function resolveLastYear(today: string) {
  const prevYear = Number(today.slice(0, 4)) - 1;
  return { start: `${prevYear}-01-01`, end: `${prevYear}-12-31` };
}

export const RANGE_OPTIONS = [
  { key: "30d", label: "30 days", group: "rolling", days: 30 },
  { key: "90d", label: "90 days", group: "rolling", days: 90 },
  { key: "180d", label: "180 days", group: "rolling", days: 180 },
  { key: "365d", label: "365 days", group: "rolling", days: 365 },
  { key: "max", label: "Max (2 years)", group: "rolling", days: 730 },
  { key: "mtd", label: "Month to date", group: "calendar", resolve: resolveMonthToDate },
  { key: "lastMonth", label: "Last month", group: "calendar", resolve: resolveLastMonth },
  { key: "qtd", label: "Quarter to date", group: "calendar", resolve: resolveQuarterToDate },
  { key: "lastQuarter", label: "Last quarter", group: "calendar", resolve: resolveLastQuarter },
  { key: "ytd", label: "Year to date", group: "calendar", resolve: resolveYearToDate },
  { key: "lastYear", label: "Last year", group: "calendar", resolve: resolveLastYear },
] as const;

export type RangeKey = (typeof RANGE_OPTIONS)[number]["key"];
export const DEFAULT_RANGE: RangeKey = "30d";

// Resolves a range option to an absolute LA-local window. Rolling options
// (those with a `days` count) end at today; calendar options use their
// resolver. `days` is the inclusive day count of the window — used by
// API calls and chart bucketing.
export function resolveRange(
  opt: RangeOption,
  today: string = laDayKey()
): { start: string; end: string; days: number } {
  if (opt.resolve) {
    const win = opt.resolve(today);
    return { ...win, days: dayDiffKeys(win.start, win.end) + 1 };
  }
  const days = opt.days ?? 30;
  return { start: shiftDayKey(today, -(days - 1)), end: today, days };
}

// Convenience: look up an option by key (or fall back to the first option)
// and resolve it. Centralizes the lookup pattern that every stats page
// previously inlined.
export function resolveRangeKey(
  key: string,
  options: ReadonlyArray<RangeOption> = RANGE_OPTIONS,
  today: string = laDayKey()
): { start: string; end: string; days: number; label: string } {
  const opt = options.find((o) => o.key === key) ?? options[0]!;
  return { ...resolveRange(opt, today), label: opt.label };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔄 REVALIDATION — call invalidateStatsCaches() to flush + refetch    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Edits arrive in bursts (multi-field saves, bulk status moves, SSE echoes of
// our own writes). Mounted subscribers refetch once per burst, this long after
// the last invalidation, instead of once per edit.
export const STATS_INVALIDATION_DEBOUNCE_MS = 750;

let statsRevalidationVersion = 0;
// Bumped by schedule edits, which only move glue attribution — they must not
// trigger a full items/activities refetch.
let gluedRevalidationVersion = 0;
// When this tab last saw a write. Stats endpoints cache their all-history
// sources per server process; reads within STATS_SERVER_CACHE_TTL_MS of a
// write ask the server for fresh data so the edit shows up immediately.
let lastStatsInvalidationAt = Number.NEGATIVE_INFINITY;
const statsRevalidationListeners = new Set<() => void>();
let statsNotifyTimer: ReturnType<typeof setTimeout> | null = null;

function notifyStatsListeners(): void {
  statsNotifyTimer = null;
  for (const cb of statsRevalidationListeners) cb();
}

function scheduleStatsNotify(): void {
  if (statsNotifyTimer) clearTimeout(statsNotifyTimer);
  statsNotifyTimer = setTimeout(
    notifyStatsListeners,
    STATS_INVALIDATION_DEBOUNCE_MS
  );
}

// Delivers a pending (debounced) invalidation to subscribers immediately.
export function flushStatsInvalidation(): void {
  if (!statsNotifyTimer) return;
  clearTimeout(statsNotifyTimer);
  notifyStatsListeners();
}

function clearGluedStatsCaches(): void {
  gluedStatsCache.clear();
  gluedStatsInflight.clear();
}

// Bumps the version so all stats hooks re-fetch, and notifies mounted
// subscribers after STATS_INVALIDATION_DEBOUNCE_MS (coalescing bursts). Call
// this after any mutation that affects items/activities (status changes, new
// items, etc). Caches are dropped immediately so anything mounting during the
// debounce window fetches committed state.
export function invalidateStatsCaches(): void {
  statsRevalidationVersion += 1;
  lastStatsInvalidationAt = Date.now();
  // A mutation invalidates fresh TTL entries too. Detach older requests so
  // subscribers fetch the committed state instead of joining a stale request.
  sharedJson.clear();
  clearGluedStatsCaches();
  scheduleStatsNotify();
}

// Narrow invalidation for planner schedule edits: only server glued stats
// (which attribute glue dates from the planner) refetch.
export function invalidateGluedStats(): void {
  gluedRevalidationVersion += 1;
  clearGluedStatsCaches();
  scheduleStatsNotify();
}

function useRevalidationValue(read: () => number): number {
  const [v, setV] = useState(read);
  useEffect(() => {
    const cb = () => setV(read());
    statsRevalidationListeners.add(cb);
    return () => {
      statsRevalidationListeners.delete(cb);
    };
    // `read` is one of the module-level readers below (stable identity).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return v;
}

const readStatsVersion = () => statsRevalidationVersion;
const readGluedVersion = () =>
  statsRevalidationVersion + gluedRevalidationVersion;

// Hook used by every stats data hook below to react to invalidation. Exported so
// standalone widgets (e.g. the mobile glued badge) can also refetch on the same bus.
export function useStatsRevalidationVersion(): number {
  return useRevalidationValue(readStatsVersion);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🔁 SHARED JSON — one request per URL across every mounted consumer   ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// How long a resolved stats response is reused before the next mount refetches.
export const SHARED_JSON_TTL_MS = 60_000;
// Must be at least the server's STATS_DATASET_TTL_MS (lib/server/stats-dataset):
// a read this soon after a write may otherwise get the server's pre-write copy.
export const STATS_SERVER_CACHE_TTL_MS = 60_000;
// Query flags that bypass the server's per-process cache and any HTTP cache.
const FRESH_QUERY_PARAM = "fresh";
const CACHE_BUST_QUERY_PARAM = "_";

type SharedJsonEntry = {
  promise: Promise<unknown>;
  // null while in flight; set when the response resolves.
  resolvedAt: number | null;
  data?: unknown;
};

const sharedJson = new Map<string, SharedJsonEntry>();

function withFreshParams(url: string): string {
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}${FRESH_QUERY_PARAM}=1&${CACHE_BUST_QUERY_PARAM}=${Date.now()}`;
}

// True when this tab wrote recently enough that the server's cached copy may
// predate the write.
export function statsReadsNeedFresh(now: number = Date.now()): boolean {
  return now - lastStatsInvalidationAt < STATS_SERVER_CACHE_TTL_MS;
}

function readSharedJson<T>(url: string, ttlMs: number): T | undefined {
  const entry = sharedJson.get(url);
  if (!entry || entry.resolvedAt === null) return undefined;
  if (Date.now() - entry.resolvedAt >= ttlMs) return undefined;
  return entry.data as T;
}

// Concurrent callers of the same URL share one request, and a resolved
// response is reused for `ttlMs`. invalidateStatsCaches() drops every entry,
// so anything still here was requested after the latest write and is safe to
// share even when the caller wants fresh data. Failed requests are dropped so
// the next caller retries.
export function fetchSharedJson<T>(
  url: string,
  { ttlMs = SHARED_JSON_TTL_MS }: { ttlMs?: number } = {}
): Promise<T> {
  const existing = sharedJson.get(url);
  if (
    existing &&
    (existing.resolvedAt === null || Date.now() - existing.resolvedAt < ttlMs)
  ) {
    return existing.promise as Promise<T>;
  }
  const fresh = statsReadsNeedFresh();
  const entry: SharedJsonEntry = { promise: Promise.resolve(), resolvedAt: null };
  entry.promise = (async () => {
    const res = await fetch(
      fresh ? withFreshParams(url) : url,
      fresh ? { cache: "no-store" } : {}
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  })().then(
    (data) => {
      if (sharedJson.get(url) === entry) {
        entry.data = data;
        entry.resolvedAt = Date.now();
      }
      return data;
    },
    (err: unknown) => {
      if (sharedJson.get(url) === entry) sharedJson.delete(url);
      throw err;
    }
  );
  sharedJson.set(url, entry);
  return entry.promise as Promise<T>;
}

export type SharedJsonState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

// React binding for fetchSharedJson. Refetches after invalidateStatsCaches()
// (debounced). While a new URL loads (e.g. a range switch) the previous data
// stays on screen; `loading` is true only when there is nothing to show yet.
// Pass null to skip fetching.
export function useSharedJson<T>(
  url: string | null,
  { ttlMs = SHARED_JSON_TTL_MS }: { ttlMs?: number } = {}
): SharedJsonState<T> {
  const version = useStatsRevalidationVersion();
  const [state, setState] = useState<SharedJsonState<T>>(() => {
    const cached = url ? readSharedJson<T>(url, ttlMs) : undefined;
    return cached !== undefined
      ? { data: cached, loading: false, error: null }
      : { data: null, loading: url !== null, error: null };
  });

  useEffect(() => {
    if (!url) return;
    const cached = readSharedJson<T>(url, ttlMs);
    if (cached !== undefined) {
      setState({ data: cached, loading: false, error: null });
      return;
    }
    setState((prev) => ({ ...prev, loading: prev.data === null, error: null }));
    let cancelled = false;
    fetchSharedJson<T>(url, { ttlMs })
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState((prev) => ({
          data: prev.data,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load",
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [url, ttlMs, version]);

  return state;
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🧮 SERVER STATS VIEWS — pages fetch aggregates, never all items      ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const STATS_VIEW_BASE_URL = "/api/stats/view";

export type StatsViewParams = Record<string, string | number>;

// Stable URL per (view, params) so equal requests share one fetch and cache.
export function statsViewUrl(view: string, params: StatsViewParams = {}): string {
  const query = new URLSearchParams(
    Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => [key, String(value)])
  ).toString();
  return query
    ? `${STATS_VIEW_BASE_URL}/${view}?${query}`
    : `${STATS_VIEW_BASE_URL}/${view}`;
}

// One server-computed view (lib/server/stats-views). Range views pass
// { start, end }; the previous range's data stays up while the next loads.
export function useStatsView<T>(
  view: string,
  params?: StatsViewParams
): SharedJsonState<T> {
  return useSharedJson<T>(statsViewUrl(view, params));
}

// All-history per-day totals shared by most pages; window them with the
// production-metrics day helpers (bucketDayCounts, onTimeStatsFromDays, …).
export function useStatsSummary(): SharedJsonState<StatsSummaryView> {
  return useStatsView<StatsSummaryView>("summary");
}

const LA_DAY_CHECK_INTERVAL_MS = 60_000;

// Current LA calendar day; re-renders when it rolls over (checked on an
// interval and on window focus) so day-keyed windows advance at midnight.
export function useLaToday(): string {
  const [today, setToday] = useState(() => laDayKey());
  useEffect(() => {
    const check = () => setToday(laDayKey());
    check();
    const timer = window.setInterval(check, LA_DAY_CHECK_INTERVAL_MS);
    window.addEventListener("focus", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
    };
  }, []);
  return today;
}

const CHART_HEIGHT = 280;
const CHART_PADDING_X = 44;
const CHART_PADDING_TOP = 16;
const CHART_PADDING_BOTTOM = 28;
const Y_AXIS_TICK_TARGET = 6;
const HOVER_TOOLTIP_WIDTH = 130;
const HOVER_TOOLTIP_HEIGHT_OFFSET = 56;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🎚️ RANGE SELECTOR                                                    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export interface RangeOption {
  key: string;
  label: string;
  // "rolling" → window ends today, length = `days`. "calendar" → explicit
  // start/end via `resolve`. Used to bucket the dropdown into two groups.
  group?: "rolling" | "calendar";
  days?: number;
  resolve?: (today: string) => { start: string; end: string };
}

interface RangeSelectorProps<K extends string = string> {
  value: K;
  // Generic so a consumer typed as `Dispatch<SetStateAction<RangeKey>>`
  // can be passed directly without an `as` cast.
  onChange: (next: K) => void;
  options?: ReadonlyArray<RangeOption>;
}

export function RangeSelector<K extends string = string>({
  value,
  onChange,
  options = RANGE_OPTIONS,
}: RangeSelectorProps<K>) {
  const rolling = options.filter(
    (o) => o.group === "rolling" || (!o.group && !o.resolve)
  );
  const calendar = options.filter((o) => o.group === "calendar" || o.resolve);

  return (
    <Select value={value} onValueChange={(v) => onChange(v as K)}>
      <SelectTrigger
        className={cn(
          "h-9 px-3 gap-2 rounded-xl glass-surface border-0 ring-0 shadow-none",
          "text-xs font-semibold text-white whitespace-nowrap min-w-[160px] w-auto",
          "focus:ring-0 focus:outline-none focus-visible:ring-0 focus:ring-offset-0",
          "data-[state=open]:bg-white/10 hover:bg-white/5"
        )}
      >
        <SelectValue placeholder="Range" />
      </SelectTrigger>
      <SelectContent
        className={cn(
          "rounded-xl border-0 glass-surface text-white shadow-xl",
          "min-w-[var(--radix-select-trigger-width)]"
        )}
      >
        {rolling.length > 0 && (
          <SelectGroup>
            <SelectLabel className="pl-3 pr-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Rolling
            </SelectLabel>
            {rolling.map((opt) => (
              <SelectItem
                key={opt.key}
                value={opt.key}
                className="text-xs font-semibold text-white focus:bg-white/15 focus:text-white"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {calendar.length > 0 && (
          <SelectGroup>
            <SelectLabel className="pl-3 pr-2 py-1 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Calendar
            </SelectLabel>
            {calendar.map((opt) => (
              <SelectItem
                key={opt.key}
                value={opt.key}
                className="text-xs font-semibold text-white focus:bg-white/15 focus:text-white"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪟 STAT TILE                                                         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

interface StatTileProps {
  label: string;
  value: number | string;
  sublabel?: string;
  tone?: "good" | "bad" | "neutral";
}

export function StatTile({
  label,
  value,
  sublabel,
  tone = "neutral",
}: StatTileProps) {
  return (
    <div className="rounded-xl glass-surface px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums leading-none",
          tone === "bad" && "text-red-500 dark:text-red-400",
          tone === "good" && "text-emerald-500 dark:text-emerald-400"
        )}
      >
        {value}
      </div>
      {sublabel && (
        <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
          {sublabel}
        </div>
      )}
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 📈 TIME-SERIES CHART                                                 ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type ChartPoint = { date: string; value: number | null };

interface TimeSeriesChartProps {
  series: ChartPoint[];
  // Tailwind-friendly hex/rgb stroke and gradient color, e.g. "rgb(248 113 113)".
  color: string;
  // Unique id for the gradient, must be unique per chart instance on page.
  gradientId: string;
  // Optional formatter for the y-axis labels and tooltip value.
  formatValue?: (v: number) => string;
  // Optional override for axis rounding.
  yAxisRoundTo?: number;
  // Optional fixed y-max (else auto).
  yMaxOverride?: number;
  // Empty-state text when series is empty.
  emptyLabel?: string;
  // Draw vertical separator at each Saturday (LA-local week start).
  showWeekBoundaries?: boolean;
}

export function TimeSeriesChart({
  series,
  color,
  gradientId,
  formatValue = (v) => v.toString(),
  yAxisRoundTo,
  yMaxOverride,
  emptyLabel = "No data yet.",
  showWeekBoundaries = false,
}: TimeSeriesChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      if (wrapRef.current) setWidth(wrapRef.current.clientWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (series.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-sm text-slate-400">
        {emptyLabel}
      </div>
    );
  }

  const innerWidth = Math.max(width - CHART_PADDING_X * 2, 1);
  const innerHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const numericValues = series
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  const rawMax =
    numericValues.length > 0 ? Math.max(...numericValues, 0) : 0;
  const roundTo = yAxisRoundTo ?? niceRoundTo(rawMax);
  const yMax =
    yMaxOverride ??
    Math.max(Math.ceil((rawMax + 1) / roundTo) * roundTo, roundTo);
  const stepX =
    series.length > 1 ? innerWidth / (series.length - 1) : innerWidth;

  const toX = (i: number) => CHART_PADDING_X + i * stepX;
  const toY = (v: number) =>
    CHART_PADDING_TOP + innerHeight - (v / yMax) * innerHeight;

  // Build polyline only over points with a numeric value, splitting on nulls.
  const segments: { i: number; v: number }[][] = [];
  let current: { i: number; v: number }[] = [];
  series.forEach((p, i) => {
    if (p.value === null) {
      if (current.length > 0) {
        segments.push(current);
        current = [];
      }
    } else {
      current.push({ i, v: p.value });
    }
  });
  if (current.length > 0) segments.push(current);

  const yTickStep = roundTo / 2;
  const yTickCount = Math.min(
    Math.floor(yMax / yTickStep),
    Y_AXIS_TICK_TARGET * 2
  );
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => {
    const value = i * yTickStep;
    return { value, y: toY(value) };
  });

  const targetXLabels = Math.min(6, series.length);
  const xLabelStep = Math.max(
    1,
    Math.floor((series.length - 1) / Math.max(targetXLabels - 1, 1))
  );
  const xLabels = series
    .map((p, i) => ({ ...p, i }))
    .filter(
      (_, i, arr) => i === 0 || i === arr.length - 1 || i % xLabelStep === 0
    );

  // Year boundaries: indices where the year changes from the previous point.
  const yearBoundaries: { i: number; year: string }[] = [];
  for (let i = 1; i < series.length; i++) {
    const prevYear = series[i - 1]!.date.slice(0, 4);
    const currYear = series[i]!.date.slice(0, 4);
    if (prevYear !== currYear) {
      yearBoundaries.push({ i, year: currYear });
    }
  }

  // Saturday (LA-local) boundaries — each Sat 00:00 starts a new week.
  // We treat the YYYY-MM-DD key as a calendar label; UTC weekday matches
  // LA-local weekday for a calendar date.
  const weekBoundaries: number[] = [];
  if (showWeekBoundaries) {
    for (let i = 0; i < series.length; i++) {
      const [y, m, d] = series[i]!.date.split("-").map(Number);
      if (
        y === undefined ||
        m === undefined ||
        d === undefined ||
        Number.isNaN(y)
      )
        continue;
      const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      if (dow === 6 && i > 0) weekBoundaries.push(i);
    }
  }

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - CHART_PADDING_X;
    const idx = Math.round(x / stepX);
    if (idx < 0 || idx >= series.length) {
      setHoverIndex(null);
      return;
    }
    setHoverIndex(idx);
  };

  const hovered = hoverIndex !== null ? series[hoverIndex] : null;
  const hoveredX = hoverIndex !== null ? toX(hoverIndex) : 0;
  const hoveredY = hovered && hovered.value !== null ? toY(hovered.value) : 0;

  const formatDateLabel = (key: string) => {
    const date = new Date(`${key}T12:00:00`);
    if (series.length > 200) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div ref={wrapRef} className="w-full relative">
      <svg
        width={width}
        height={CHART_HEIGHT}
        className="overflow-visible"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={t.value}>
            <line
              x1={CHART_PADDING_X}
              x2={width - CHART_PADDING_X}
              y1={t.y}
              y2={t.y}
              stroke="currentColor"
              strokeOpacity="0.08"
              strokeDasharray="3 3"
            />
            <text
              x={CHART_PADDING_X - 8}
              y={t.y + 4}
              textAnchor="end"
              className="fill-slate-400"
              fontSize="11"
            >
              {formatValue(t.value)}
            </text>
          </g>
        ))}

        {segments.map((seg, segIdx) => {
          const pts = seg.map(({ i, v }) => ({ x: toX(i), y: toY(v) }));
          const linePathD = smoothPath(pts);
          const baseY = (CHART_PADDING_TOP + innerHeight).toFixed(1);
          const areaPath =
            pts.length === 1
              ? `M ${pts[0]!.x.toFixed(1)} ${baseY} L ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)} Z`
              : `M ${pts[0]!.x.toFixed(1)} ${baseY} L ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)} ${smoothCommands(pts)} L ${pts[pts.length - 1]!.x.toFixed(1)} ${baseY} Z`;
          return (
            <g key={segIdx}>
              <path d={areaPath} fill={`url(#${gradientId})`} />
              <path
                d={linePathD}
                fill="none"
                stroke={color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}

        {xLabels.map((p) => (
          <text
            key={p.date}
            x={toX(p.i)}
            y={CHART_HEIGHT - 8}
            textAnchor="middle"
            className="fill-slate-400"
            fontSize="11"
          >
            {formatDateLabel(p.date)}
          </text>
        ))}

        {weekBoundaries.map((i) => (
          <line
            key={`week-${i}`}
            x1={toX(i)}
            x2={toX(i)}
            y1={CHART_PADDING_TOP}
            y2={CHART_PADDING_TOP + innerHeight}
            stroke="white"
            strokeOpacity="0.1"
            strokeWidth={1}
          />
        ))}

        {yearBoundaries.map((b) => (
          <g key={`year-${b.i}`}>
            <line
              x1={toX(b.i)}
              x2={toX(b.i)}
              y1={CHART_PADDING_TOP}
              y2={CHART_PADDING_TOP + innerHeight}
              stroke="white"
              strokeOpacity="0.35"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text
              x={toX(b.i) + 4}
              y={CHART_PADDING_TOP + 11}
              textAnchor="start"
              className="fill-white"
              fontSize="10"
              fontWeight="600"
              opacity="0.7"
            >
              {b.year}
            </text>
          </g>
        ))}

        {hovered && hovered.value !== null && (
          <g pointerEvents="none">
            <line
              x1={hoveredX}
              x2={hoveredX}
              y1={CHART_PADDING_TOP}
              y2={CHART_PADDING_TOP + innerHeight}
              stroke="currentColor"
              strokeOpacity="0.2"
              strokeDasharray="2 3"
            />
            <circle
              cx={hoveredX}
              cy={hoveredY}
              r={4}
              fill={color}
              stroke="white"
              strokeOpacity="0.9"
              strokeWidth={1.5}
            />
          </g>
        )}
      </svg>

      {hovered && hovered.value !== null && (
        <div
          className="pointer-events-none absolute glass-surface px-3 py-2 rounded-lg text-xs shadow-lg"
          style={{
            left: Math.min(
              Math.max(hoveredX - 60, 0),
              Math.max(width - HOVER_TOOLTIP_WIDTH, 0)
            ),
            top: Math.max(hoveredY - HOVER_TOOLTIP_HEIGHT_OFFSET, 0),
          }}
        >
          <div className="text-[10px] uppercase tracking-wider text-slate-400">
            {new Date(`${hovered.date}T12:00:00`).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
          <div
            className="text-base font-bold tabular-nums leading-tight"
            style={{ color }}
          >
            {formatValue(hovered.value)}
          </div>
        </div>
      )}
    </div>
  );
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪝 useHealthScore — server-computed health score (nav badge)         ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// The nav badge renders on every page; computing health client-side meant
// shipping every item ever (Done included) to each tab. The server computes
// the same computeHealthScore and returns ~1 KB, shared by every consumer.
const HEALTH_SCORE_URL = "/api/stats/health";

export type HealthScorePayload = {
  total: number;
  breakdown: HealthBreakdownRow[];
};

export function useHealthScore(): SharedJsonState<HealthScorePayload> {
  return useSharedJson<HealthScorePayload>(HEALTH_SCORE_URL);
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🪝 useGluedStats — server-computed glued events + buckets per range  ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

const GLUED_STATS_CACHE_TTL_MS = 60_000;

export type GluedStatsPayload = {
  events: GluedEvent[];
  buckets: DayBucket[];
  range: { start: string; end: string; days: number };
};

type GluedStatsState = {
  data: GluedStatsPayload | null;
  loading: boolean;
  error: string | null;
};

// Cache key: explicit window so calendar-bounded ranges (e.g. "Last month")
// don't collide with rolling windows of the same length.
const gluedStatsCache = new Map<
  string,
  { data: GluedStatsPayload; ts: number }
>();
const gluedStatsInflight = new Map<string, Promise<GluedStatsPayload>>();

async function fetchGluedStats(
  start: string,
  end: string,
  bypassCache = false
): Promise<GluedStatsPayload> {
  const cacheKey = `${start}|${end}`;
  // Invalidation clears this map, so any in-flight request was started after
  // the latest edit — safe to share even when bypassing the HTTP cache. This
  // is what collapses the planner's capacity, badge and nav consumers into a
  // single request.
  const existing = gluedStatsInflight.get(cacheKey);
  if (existing) return existing;
  const requestVersion = readGluedVersion();
  const promise = (async () => {
    try {
      const base = `/api/stats/glued?start=${start}&end=${end}`;
      const url = bypassCache ? `${base}&_=${Date.now()}` : base;
      const res = await fetch(url, bypassCache ? { cache: "no-store" } : {});
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as GluedStatsPayload;
      if (requestVersion === readGluedVersion()) gluedStatsCache.set(cacheKey, { data, ts: Date.now() });
      return data;
    } finally {
      if (requestVersion === readGluedVersion()) gluedStatsInflight.delete(cacheKey);
    }
  })();
  gluedStatsInflight.set(cacheKey, promise);
  return promise;
}

export function useGluedStats(window: {
  start: string;
  end: string;
}): GluedStatsState {
  const { start, end } = window;
  const cacheKey = `${start}|${end}`;
  const version = useRevalidationValue(readGluedVersion);
  const [state, setState] = useState<GluedStatsState>(() => {
    const cached = gluedStatsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < GLUED_STATS_CACHE_TTL_MS) {
      return { data: cached.data, loading: false, error: null };
    }
    return { data: null, loading: true, error: null };
  });

  useEffect(() => {
    const cached = gluedStatsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < GLUED_STATS_CACHE_TTL_MS) {
      setState({ data: cached.data, loading: false, error: null });
      return;
    }
    gluedStatsCache.delete(cacheKey);
    setState((s) => ({ ...s, loading: true, error: null }));
    let cancelled = false;
    fetchGluedStats(start, end, version > 0)
      .then((data) => {
        if (cancelled) return;
        setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          data: null,
          loading: false,
          error:
            err instanceof Error ? err.message : "Failed to load glued stats",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [start, end, cacheKey, version]);

  return state;
}

// Catmull-Rom → cubic-Bezier curve commands, used to smooth chart lines
// without overshoot. `smoothPath` returns a full path starting with M;
// `smoothCommands` returns the C segments only (caller has already moved
// the pen to pts[0]).
export function smoothCommands(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = "";
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `;
  }
  return d.trim();
}

export function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return "";
  const head = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  if (pts.length === 1) return head;
  return `${head} ${smoothCommands(pts)}`;
}

// Pick a "nice" round-to value for axis ticks based on the data magnitude.
// Aims for ~5 buckets across the y-axis using 1/2/5 × 10^k progression so
// tick labels stay readable across small (debt-days) and large (backlog-
// squares) ranges. yTickStep = roundTo / 2 in the chart, yTickCount caps
// at 12 — so roundTo ≈ rawMax/5 keeps labels covering the full data range.
function niceRoundTo(rawMax: number): number {
  if (rawMax <= 0) return 1;
  const target = rawMax / 5;
  const exp = Math.floor(Math.log10(target));
  const base = target / Math.pow(10, exp);
  const nice = base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10;
  return nice * Math.pow(10, exp);
}
