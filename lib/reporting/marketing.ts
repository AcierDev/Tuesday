import { dayDiffKeys, laDayKey, shiftDayKey } from "../debt-metrics";
import type { ReportWindow } from "./fulfillment";

export type Platform = "etsy" | "shopify";
export type SalesChannel = Platform | "other";
export type AdPlatform = "etsy_ads" | "etsy_offsite" | "meta" | "pinterest" | "other";
export type DataQuality = "complete" | "delayed" | "partial" | "unverified";
type SourceFields = { key: string; sourceUrl?: string; capturedAt?: string; quality?: DataQuality; sourceTimezone?: string };

export type ShopRecord = SourceFields & {
  kind: "shop";
  platform: Platform;
  date: string;
  listingId?: string;
  visits?: number | null;
  listingViews?: number | null;
  favorites?: number | null;
  orders?: number | null;
  revenue?: number | null;
  organicVisits?: number | null;
  paidVisits?: number | null;
  socialVisits?: number | null;
};
export type SocialRecord = SourceFields & {
  kind: "social";
  platform: "facebook" | "instagram" | "pinterest";
  date: string;
  reach?: number | null;
  impressions?: number | null;
  engagements?: number | null;
  saves?: number | null;
  shopLinkClicks?: number | null;
};
export type AdRecord = SourceFields & {
  kind: "ad";
  platform: AdPlatform;
  placement?: string;
  campaignId?: string;
  date: string;
  campaignStatus?: "active" | "paused" | "off" | "unknown";
  dailyBudgetCap?: number | null;
  spend?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  landingPageViews?: number | null;
  attributedOrders?: number | null;
  attributedRevenue?: number | null;
  conversionTrackingVerified?: boolean;
};
export type CartSnapshot = SourceFields & {
  kind: "cart";
  platform: "etsy";
  windowDays: 7 | 30;
  windowStart: string;
  windowEnd: string;
  count: number;
  capturedAt: string;
};
export type InquiryRecord = SourceFields & {
  kind: "inquiry";
  platform: "etsy";
  start: string;
  end: string;
  count: number | null;
  minimumVerified?: number;
  themes?: Record<string, number>;
  orderStatusVerified?: boolean;
};
export type EconomicsRecord = SourceFields & {
  kind: "economics";
  platform: Platform;
  orderId: string;
  date: string;
  grossRevenue?: number | null;
  discounts?: number | null;
  refunds?: number | null;
  shippingCharged?: number | null;
  shippingCost?: number | null;
  materialsCost?: number | null;
  laborCost?: number | null;
};
export type OrderLinkRecord = SourceFields & {
  kind: "order_link";
  itemId: string;
  platform: SalesChannel;
  orderId: string;
};
export type ChangeRecord = SourceFields & {
  kind: "change";
  effectiveAt: string;
  area: "production" | "promise" | "listing" | "campaign" | "other";
  summary: string;
};
export type ReportingRecord =
  | ShopRecord | SocialRecord | AdRecord | CartSnapshot | InquiryRecord | EconomicsRecord | OrderLinkRecord | ChangeRecord;

export type Metric = { value: number | null; coveredDays: number; complete: boolean };
const SHOP_METRICS = ["visits", "listingViews", "favorites", "orders", "revenue", "organicVisits", "paidVisits", "socialVisits"] as const;
const SOCIAL_METRICS = ["reach", "impressions", "engagements", "saves", "shopLinkClicks"] as const;
const AD_METRICS = ["spend", "impressions", "clicks", "landingPageViews", "attributedOrders", "attributedRevenue"] as const;
const ECONOMICS_METRICS = ["grossRevenue", "discounts", "refunds", "shippingCharged", "shippingCost", "materialsCost", "laborCost"] as const;
const VIEWS_RATE_BASE = 100;
const CTR_PERCENT_BASE = 100;
const CPM_IMPRESSION_BASE = 1000;
const SNAPSHOT_OFFSET_DAYS = 1;

function metric<T extends { date: string }>(
  records: T[],
  key: keyof T,
  expectedDays: number
): Metric {
  const available = records.filter((row) => typeof row[key] === "number");
  const days = new Set(available.map((row) => row.date)).size;
  return {
    value: available.length
      ? available.reduce((sum, row) => sum + Number(row[key]), 0)
      : null,
    coveredDays: days,
    complete: days === expectedDays && available.every((row) => (row as { quality?: DataQuality }).quality === "complete"),
  };
}

function metricSet<T extends { date: string }, K extends keyof T>(
  records: T[], keys: readonly K[], expectedDays: number
): Record<K, Metric> {
  return Object.fromEntries(keys.map((key) => [key, metric(records, key, expectedDays)])) as Record<K, Metric>;
}

function adMetric(records: AdRecord[], key: keyof AdRecord, expectedDays: number): Metric {
  const aggregate = metric(records, key, expectedDays);
  const campaigns = new Map<string, AdRecord[]>();
  for (const row of records) {
    const campaignKey = JSON.stringify([
      row.campaignId ?? null,
      row.placement ?? null,
    ]);
    campaigns.set(campaignKey, [...(campaigns.get(campaignKey) ?? []), row]);
  }
  return {
    ...aggregate,
    complete: campaigns.size > 0 && [...campaigns.values()].every(
      (rows) => metric(rows, key, expectedDays).complete
    ),
  };
}

function adMetricSet(records: AdRecord[], expectedDays: number) {
  return Object.fromEntries(
    AD_METRICS.map((key) => [key, adMetric(records, key, expectedDays)])
  ) as Record<(typeof AD_METRICS)[number], Metric>;
}

function adBucket(records: AdRecord[], expectedDays: number) {
  const totals = adMetricSet(records, expectedDays);
  const spend = totals.spend.value;
  const impressions = totals.impressions.value;
  const clicks = totals.clicks.value;
  const attributionSupported = records.length > 0 &&
    records.every((row) => row.conversionTrackingVerified === true);
  return { ...totals,
    sourceTimezones: [...new Set(records.map((row) => row.sourceTimezone).filter((zone): zone is string => !!zone))],
    averageActualSpendPerDay: spend == null ? null : spend / expectedDays,
    ctrPercent: impressions && clicks != null ? clicks / impressions * CTR_PERCENT_BASE : null,
    cpc: clicks && spend != null ? spend / clicks : null,
    cpm: impressions && spend != null ? spend / impressions * CPM_IMPRESSION_BASE : null,
    cpa: attributionSupported && totals.spend.complete && totals.attributedOrders.complete &&
      totals.attributedOrders.value
      ? spend! / totals.attributedOrders.value : null,
    roas: attributionSupported && totals.spend.complete && totals.attributedRevenue.complete && spend
      ? totals.attributedRevenue.value! / spend : null,
  };
}

export function summarizeMarketingWeek(
  input: readonly ReportingRecord[],
  window: ReportWindow
) {
  const expectedDays = dayDiffKeys(window.start, window.end) + 1;
  const records = [...new Map<string, ReportingRecord>(input.map((row) => [row.key, row] as const)).values()];
  const inWeek = (date: string) => date >= window.start && date <= window.end;
  const shops = (platform: Platform) => {
    const daily = records.filter((row): row is ShopRecord =>
      row.kind === "shop" && row.platform === platform && !row.listingId && inWeek(row.date)
    );
    const totals = metricSet(daily, SHOP_METRICS, expectedDays);
    const views = totals.listingViews.value;
    const favorites = totals.favorites.value;
    return {
      ...totals,
      favoritesPer100Views: views && favorites != null ? favorites / views * VIEWS_RATE_BASE : null,
      favoriteRateComplete: totals.favorites.complete && totals.listingViews.complete,
    };
  };
  const listings = records.filter((row): row is ShopRecord =>
    row.kind === "shop" && row.platform === "etsy" && !!row.listingId && inWeek(row.date)
  );
  const listingIds = [...new Set(listings.map((row) => row.listingId!))];
  const listingSummaries = Object.fromEntries(listingIds.map((id) => {
    const totals = metricSet(listings.filter((row) => row.listingId === id), SHOP_METRICS, expectedDays);
    const views = totals.listingViews.value;
    const favorites = totals.favorites.value;
    return [id, { ...totals, favoritesPer100Views: views && favorites != null ? favorites / views * VIEWS_RATE_BASE : null }];
  }));
  const social = (platform: SocialRecord["platform"]) => {
    const daily = records.filter((row): row is SocialRecord =>
      row.kind === "social" && row.platform === platform && inWeek(row.date)
    );
    return metricSet(daily, SOCIAL_METRICS, expectedDays);
  };

  const ads = records.filter((row): row is AdRecord => row.kind === "ad" && inWeek(row.date));
  const byPlatform = (platform: AdPlatform, placement?: string) =>
    adBucket(ads.filter((row) => row.platform === platform && (!placement || (row.placement ?? "other") === placement)), expectedDays);
  const metaOther = ads.filter((row) => row.platform === "meta" && !["facebook", "instagram"].includes(row.placement ?? ""));
  const latestCampaignRows = new Map<string, AdRecord>();
  for (const row of records.filter((record): record is AdRecord =>
    record.kind === "ad" && record.date <= window.end
  ).sort((a, b) => a.date.localeCompare(b.date))) {
    latestCampaignRows.set(`${row.platform}:${row.campaignId ?? row.placement ?? "all"}`, row);
  }
  const budgetCaps = [...latestCampaignRows.values()].map((row) => ({
    platform: row.platform,
    campaignId: row.campaignId ?? null,
    placement: row.placement ?? null,
    status: row.campaignStatus ?? "unknown",
    dailyBudgetCap: row.dailyBudgetCap ?? null,
    observedDate: row.date,
  }));
  const campaignDelivery = budgetCaps.map((campaign) => {
    const rows = ads.filter((row) => row.platform === campaign.platform &&
      (row.campaignId ?? row.placement ?? "all") ===
      (campaign.campaignId ?? campaign.placement ?? "all"));
    return { ...campaign, spend: metric(rows, "spend", expectedDays),
      impressions: metric(rows, "impressions", expectedDays),
      clicks: metric(rows, "clicks", expectedDays) };
  });
  const spendByChannel = ["etsy_ads", "meta", "pinterest", "other"] as const;
  const channelSpend = Object.fromEntries(spendByChannel.map((platform) => [
    platform,
    adMetric(ads.filter((row) => row.platform === platform), "spend", expectedDays),
  ])) as Record<(typeof spendByChannel)[number], Metric>;
  const offsiteFees = metric(ads.filter((row) => row.platform === "etsy_offsite"), "spend", expectedDays);
  const verifiedUpfrontSubtotal = Object.values(channelSpend)
    .reduce((sum, amount) => sum + (amount.value ?? 0), 0);
  const paidSpend = {
    verifiedUpfrontSubtotal,
    verifiedOffsiteFees: offsiteFees.value,
    verifiedChargesSubtotal: verifiedUpfrontSubtotal + (offsiteFees.value ?? 0),
    averageUpfrontPerDay: verifiedUpfrontSubtotal / expectedDays,
    missingChannels: spendByChannel.filter((platform) => channelSpend[platform].value == null),
    incompleteChannels: spendByChannel.filter((platform) => !channelSpend[platform].complete),
    offsiteFeesComplete: offsiteFees.complete,
    activeDailyBudgetCapsObserved: budgetCaps
      .filter((row) => row.status === "active" && row.dailyBudgetCap != null)
      .reduce((sum, row) => sum + row.dailyBudgetCap!, 0),
  };

  const snapshotDay = shiftDayKey(window.end, SNAPSHOT_OFFSET_DAYS);
  const cartRows = records.filter((row): row is CartSnapshot =>
    row.kind === "cart" && laDayKey(new Date(row.capturedAt)) === snapshotDay
  );
  const latestCart = (days: 7 | 30) =>
    cartRows.filter((row) => row.windowDays === days)
      .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))
      .map(({ count, capturedAt, windowDays, windowStart, windowEnd, quality }) =>
        ({ count, capturedAt, windowDays, windowStart, windowEnd, quality }))[0] ?? null;
  const inquiryRecord = records.filter((row): row is InquiryRecord =>
    row.kind === "inquiry" && row.start === window.start && row.end === window.end
  ).sort((a, b) => (b.capturedAt ?? "").localeCompare(a.capturedAt ?? ""))[0] ?? null;
  const inquiries = inquiryRecord && {
    count: inquiryRecord.count,
    minimumVerified: inquiryRecord.minimumVerified ?? null,
    themes: inquiryRecord.themes ?? {},
    orderStatusVerified: inquiryRecord.orderStatusVerified ?? false,
    capturedAt: inquiryRecord.capturedAt,
    quality: inquiryRecord.quality,
  };
  const economics = (platform: Platform) => {
    const rows = records.filter((row): row is EconomicsRecord =>
      row.kind === "economics" && row.platform === platform && inWeek(row.date)
    );
    const completeRows = rows.filter((row) => ECONOMICS_METRICS.every((field) =>
      typeof row[field] === "number"
    ));
    const contribution = completeRows.length
      ? completeRows.reduce((sum, row) => sum + row.grossRevenue! - row.discounts! -
        row.refunds! + row.shippingCharged! - row.shippingCost! -
        row.materialsCost! - row.laborCost!, 0)
      : null;
    return { orderRecords: rows.length,
      ...metricSet(rows, ECONOMICS_METRICS, expectedDays),
      contribution: { value: contribution, completeOrders: completeRows.length } };
  };
  const changes = records.filter((row): row is ChangeRecord =>
    row.kind === "change" && inWeek(laDayKey(new Date(row.effectiveAt)))
  ).map(({ effectiveAt, area, summary }) => ({ effectiveAt, area, summary }));

  return {
    window,
    shops: { etsy: shops("etsy"), shopify: shops("shopify") },
    etsyListings: listingSummaries,
    social: { facebook: social("facebook"), instagram: social("instagram"), pinterest: social("pinterest") },
    ads: {
      etsyAds: byPlatform("etsy_ads"),
      etsyOffsite: byPlatform("etsy_offsite"),
      meta: {
        facebook: byPlatform("meta", "facebook"),
        instagram: byPlatform("meta", "instagram"),
        other: adBucket(metaOther, expectedDays),
      },
      pinterest: byPlatform("pinterest"),
      other: byPlatform("other"),
      budgetCaps,
      campaignDelivery,
    },
    paidSpend,
    cartSnapshots: { last7Days: latestCart(7), last30Days: latestCart(30) },
    inquiries,
    economics: { etsy: economics("etsy"), shopify: economics("shopify") },
    changes,
  };
}
