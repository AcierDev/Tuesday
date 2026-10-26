import { dayDiffKeys, laDayKey } from "@/lib/debt-metrics";
import type { Activity, Item, OrderTrackingInfo } from "@/typings/types";

import {
  computeForecastView,
  computeHealthWhatIfView,
  computeLateView,
  computeTodayView,
} from "./active";
import {
  computeBottlenecksView,
  computeLeadTimeView,
  computeMixView,
  computeQualityView,
  computeTrendingView,
  computeWipView,
} from "./history";
import { isDayKey, STATS_VIEW_MAX_DAYS } from "./shared";
import {
  computeDeliveryView,
  computeMapView,
  computeShippingView,
} from "./shipping";
import { computeSummaryView } from "./summary";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🗂️ STATS VIEW REGISTRY — /api/stats/view/<name>                      ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Each stats page asks the server for exactly what it renders. Views read the
// cached all-history sources (lib/server/stats-dataset) and run the same
// production-metrics functions the pages used to run on every item.

export type StatsViewSources = {
  items: () => Promise<Item[]>;
  statusActivities: () => Promise<Activity[]>;
  trackers: () => Promise<OrderTrackingInfo[]>;
};

export class StatsViewParamError extends Error {}

// Trending windows the page offers.
const TRENDING_ALLOWED_DAYS: ReadonlySet<number> = new Set([30, 90]);

function rangeParams(params: URLSearchParams): { start: string; end: string } {
  const start = params.get("start");
  const end = params.get("end");
  if (!isDayKey(start) || !isDayKey(end)) {
    throw new StatsViewParamError("start and end must be YYYY-MM-DD");
  }
  const span = dayDiffKeys(start, end) + 1;
  if (span < 1 || span > STATS_VIEW_MAX_DAYS) {
    throw new StatsViewParamError(
      `range must cover 1–${STATS_VIEW_MAX_DAYS} days`
    );
  }
  return { start, end };
}

type StatsViewHandler = (
  sources: StatsViewSources,
  params: URLSearchParams
) => Promise<unknown>;

export const STATS_VIEWS: Record<string, StatsViewHandler> = {
  summary: async (s) => computeSummaryView(await s.items()),
  "health-whatif": async (s) => computeHealthWhatIfView(await s.items()),
  late: async (s) => computeLateView(await s.items()),
  today: async (s) => computeTodayView(await s.items()),
  forecast: async (s) => computeForecastView(await s.items()),
  "lead-time": async (s, p) => {
    const { start, end } = rangeParams(p);
    return computeLeadTimeView(await s.items(), start, end);
  },
  mix: async (s, p) => {
    const { start, end } = rangeParams(p);
    return computeMixView(await s.items(), start, end);
  },
  trending: async (s, p) => {
    const days = Number(p.get("days"));
    if (!TRENDING_ALLOWED_DAYS.has(days)) {
      throw new StatsViewParamError("unsupported trending window");
    }
    return computeTrendingView(await s.items(), laDayKey(), days);
  },
  wip: async (s) => {
    const [items, activities] = await Promise.all([
      s.items(),
      s.statusActivities(),
    ]);
    return computeWipView(items, activities);
  },
  bottlenecks: async (s) => {
    const [items, activities] = await Promise.all([
      s.items(),
      s.statusActivities(),
    ]);
    return computeBottlenecksView(items, activities);
  },
  quality: async (s) => {
    const [items, activities] = await Promise.all([
      s.items(),
      s.statusActivities(),
    ]);
    return computeQualityView(items, activities);
  },
  shipping: async (s, p) => {
    const { start, end } = rangeParams(p);
    return computeShippingView(await s.items(), start, end);
  },
  map: async (s) => computeMapView(await s.items()),
  delivery: async (s) => {
    const [items, trackers] = await Promise.all([s.items(), s.trackers()]);
    return computeDeliveryView(items, trackers);
  },
};
