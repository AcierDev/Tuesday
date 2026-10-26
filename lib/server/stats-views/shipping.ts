import { laDayKey } from "@/lib/debt-metrics";
import {
  bucketShippingSpendByDay,
  buildDeliveryByOrder,
  computeDeliverySpeeds,
  computeStateMix,
  shipmentCost,
  summarizeShippingSpend,
  type DeliverySpeedRow,
  type ShippingSpendRow,
} from "@/lib/production-metrics";
import type { Item, OrderTrackingInfo } from "@/typings/types";

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ ⚙️ CONFIG                                                            ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

// Shipping page: service rows listed.
const SHIPPING_TOP_SERVICE_LIMIT = 8;
// Delivery page: most recent delivered shipments listed.
const DELIVERY_RECENT_LIMIT = 30;

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 💸 SHIPPING SPEND — labels bought in [start, end]                    ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type ShippingView = {
  buckets: ShippingSpendRow[];
  summary: ReturnType<typeof summarizeShippingSpend>;
  serviceRows: { service: string; count: number; cost: number }[];
};

export function computeShippingView(
  items: Item[],
  start: string,
  end: string
): ShippingView {
  const buckets = bucketShippingSpendByDay(items, start, end);
  const summary = summarizeShippingSpend(buckets);

  // Service-type breakdown
  const byService = new Map<string, { count: number; cost: number }>();
  for (const item of items) {
    const ship = item.purchasedShipment;
    if (!ship?.purchasedAt) continue;
    const key = laDayKey(new Date(ship.purchasedAt));
    if (key < start || key > end) continue;
    // Same rule as the spend totals: unpriced (uploaded / $0) labels don't
    // count toward spend or per-shipment averages.
    const cost = shipmentCost(ship);
    if (cost === null) continue;
    const svc = ship.serviceName || ship.serviceType || "Unknown";
    const cur = byService.get(svc) ?? { count: 0, cost: 0 };
    cur.count += 1;
    cur.cost += cost;
    byService.set(svc, cur);
  }
  const serviceRows = Array.from(byService.entries())
    .map(([service, v]) => ({ service, count: v.count, cost: v.cost }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, SHIPPING_TOP_SERVICE_LIMIT);

  return { buckets, summary, serviceRows };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🗺️ MAP — orders per destination state                                ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type StateRow = ReturnType<typeof computeStateMix>[number];
export type MapView = {
  stateRows: StateRow[];
  totalShipped: number;
  top: StateRow | undefined;
  distinctStates: number;
};

export function computeMapView(items: Item[]): MapView {
  const stateRows = computeStateMix(items);
  return {
    stateRows,
    totalShipped: stateRows.reduce((s, r) => s + r.count, 0),
    top: stateRows[0],
    distinctStates: stateRows.length,
  };
}

//╔═══╗ ════════════════════════════════════════════════════════════════ ╔═══╗
//║ 🚚 DELIVERY SPEED — purchase → delivered scan                        ║
//╚═══╝ ════════════════════════════════════════════════════════════════ ╚═══╝

export type DeliveryView = {
  count: number;
  recent: DeliverySpeedRow[];
  avg: number;
  median: number;
  fastest: number;
  slowest: number;
  byService: { service: string; count: number; avg: number }[];
};

export function computeDeliveryView(
  items: Item[],
  trackingInfos: OrderTrackingInfo[]
): DeliveryView {
  const rows = computeDeliverySpeeds(items, buildDeliveryByOrder(trackingInfos));
  if (rows.length === 0) {
    return {
      count: 0,
      recent: [],
      avg: 0,
      median: 0,
      fastest: 0,
      slowest: 0,
      byService: [],
    };
  }
  const sorted = [...rows].map((r) => r.transitDays).sort((a, b) => a - b);
  const sum = sorted.reduce((s, v) => s + v, 0);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2
      : sorted[mid] ?? 0;

  const byService = new Map<string, number[]>();
  for (const r of rows) {
    const svc = r.serviceType ?? "Unknown";
    const list = byService.get(svc) ?? [];
    list.push(r.transitDays);
    byService.set(svc, list);
  }
  const serviceRows = Array.from(byService.entries())
    .map(([service, vs]) => ({
      service,
      count: vs.length,
      avg: vs.reduce((s, v) => s + v, 0) / vs.length,
    }))
    .sort((a, b) => a.avg - b.avg);

  return {
    count: rows.length,
    recent: rows.slice(0, DELIVERY_RECENT_LIMIT),
    avg: sum / sorted.length,
    median,
    fastest: sorted[0] ?? 0,
    slowest: sorted[sorted.length - 1] ?? 0,
    byService: serviceRows,
  };
}
