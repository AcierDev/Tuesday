import { dayDiffKeys } from "../debt-metrics";
import type {
  AdPlatform, AdRecord, CartSnapshot, ChangeRecord, DataQuality,
  EconomicsRecord, InquiryRecord, Platform, ReportingRecord, ShopRecord, SocialRecord,
} from "./marketing";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ID_LENGTH = 160;
const MAX_SUMMARY_LENGTH = 300;
const MAX_THEMES = 20;
const WEEK_DAYS = 7;
const CART_WINDOWS = [7, 30] as const;
const QUALITY_VALUES: DataQuality[] = ["complete", "delayed", "partial", "unverified"];
const SHOP_PLATFORMS: Platform[] = ["etsy", "shopify"];
const AD_PLATFORMS: AdPlatform[] = ["etsy_ads", "etsy_offsite", "meta", "pinterest", "other"];
const AD_STATUSES = ["active", "paused", "off", "unknown"] as const;
const CHANGE_AREAS = ["production", "promise", "listing", "campaign", "other"] as const;
const COUNT_FIELDS = new Set([
  "visits", "listingViews", "favorites", "orders", "impressions", "clicks",
  "landingPageViews", "attributedOrders", "count", "minimumVerified",
  "organicVisits", "paidVisits", "socialVisits", "reach", "engagements", "saves", "shopLinkClicks",
]);
const MONEY_FIELDS = new Set([
  "revenue", "dailyBudgetCap", "spend", "attributedRevenue", "grossRevenue",
  "discounts", "refunds", "shippingCharged", "shippingCost", "materialsCost", "laborCost",
]);
const COMMON_FIELDS = ["kind", "sourceUrl", "capturedAt", "quality", "sourceTimezone"] as const;
const KIND_FIELDS: Record<ReportingRecord["kind"], readonly string[]> = {
  shop: ["platform", "date", "listingId", "visits", "listingViews", "favorites", "orders", "revenue", "organicVisits", "paidVisits", "socialVisits"],
  social: ["platform", "date", "reach", "impressions", "engagements", "saves", "shopLinkClicks"],
  ad: ["platform", "placement", "campaignId", "date", "campaignStatus", "dailyBudgetCap", "spend", "impressions", "clicks", "landingPageViews", "attributedOrders", "attributedRevenue", "conversionTrackingVerified"],
  cart: ["platform", "windowDays", "windowStart", "windowEnd", "count"],
  inquiry: ["platform", "start", "end", "count", "minimumVerified", "themes", "orderStatusVerified"],
  economics: ["platform", "orderId", "date", "grossRevenue", "discounts", "refunds", "shippingCharged", "shippingCost", "materialsCost", "laborCost"],
  order_link: ["itemId", "platform", "orderId"],
  change: ["effectiveAt", "area", "summary"],
};

function fail(field: string): never {
  throw new Error(`Invalid reporting field: ${field}`);
}

function object(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("record");
  return input as Record<string, unknown>;
}

function date(value: unknown, field: string): string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) fail(field);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(field);
  return value;
}

function timestamp(value: unknown, field: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || !/([zZ]|[+-]\d\d:\d\d)$/.test(value)) fail(field);
  return new Date(value).toISOString();
}

function text(value: unknown, field: string, max = MAX_ID_LENGTH): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) fail(field);
  return value.trim();
}

function number(value: unknown, field: string, integer: boolean): number | null | undefined {
  if (value == null) return value;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) fail(field);
  return value;
}

function choice<T extends string>(value: unknown, options: readonly T[], field: string): T {
  if (typeof value !== "string" || !options.includes(value as T)) fail(field);
  return value as T;
}

function part(value: string | undefined): string {
  return encodeURIComponent(value ?? "");
}

export function parseReportingRecord(input: unknown, recordedAt: string): ReportingRecord {
  const raw = object(input);
  const kind = choice(raw.kind, Object.keys(KIND_FIELDS) as ReportingRecord["kind"][], "kind");
  const allowed = new Set<string>([...COMMON_FIELDS, ...KIND_FIELDS[kind]]);
  for (const field of Object.keys(raw)) if (!allowed.has(field)) fail(field);

  const sourceUrl = raw.sourceUrl == null ? undefined : text(raw.sourceUrl, "sourceUrl", 2000);
  if (sourceUrl && !sourceUrl.startsWith("https://")) fail("sourceUrl");
  const quality = raw.quality == null ? "unverified" : choice(raw.quality, QUALITY_VALUES, "quality");
  if (quality === "complete" && !sourceUrl) fail("sourceUrl");
  const capturedAt = raw.capturedAt == null
    ? timestamp(recordedAt, "recordedAt")
    : timestamp(raw.capturedAt, "capturedAt");
  const sourceTimezone = raw.sourceTimezone == null
    ? undefined : text(raw.sourceTimezone, "sourceTimezone");
  if (sourceTimezone) {
    try { new Intl.DateTimeFormat("en-US", { timeZone: sourceTimezone }); }
    catch { fail("sourceTimezone"); }
  }
  const base = { kind, sourceUrl, quality, capturedAt, sourceTimezone };

  for (const field of Object.keys(raw)) {
    if (COUNT_FIELDS.has(field)) number(raw[field], field, true);
    if (MONEY_FIELDS.has(field)) number(raw[field], field, false);
  }

  if (kind === "shop") {
    const platform = choice(raw.platform, SHOP_PLATFORMS, "platform");
    const day = date(raw.date, "date");
    const listingId = raw.listingId == null ? undefined : text(raw.listingId, "listingId");
    return { ...base, kind, key: `shop:${platform}:${day}:${part(listingId)}`,
      platform, date: day, listingId,
      visits: raw.visits as ShopRecord["visits"], listingViews: raw.listingViews as ShopRecord["listingViews"],
      favorites: raw.favorites as ShopRecord["favorites"], orders: raw.orders as ShopRecord["orders"],
      revenue: raw.revenue as ShopRecord["revenue"],
      organicVisits: raw.organicVisits as ShopRecord["organicVisits"],
      paidVisits: raw.paidVisits as ShopRecord["paidVisits"],
      socialVisits: raw.socialVisits as ShopRecord["socialVisits"] };
  }
  if (kind === "social") {
    const platform = choice(raw.platform, ["facebook", "instagram", "pinterest"] as const, "platform");
    const day = date(raw.date, "date");
    return { ...base, kind, key: `social:${platform}:${day}`, platform, date: day,
      reach: raw.reach as SocialRecord["reach"],
      impressions: raw.impressions as SocialRecord["impressions"],
      engagements: raw.engagements as SocialRecord["engagements"],
      saves: raw.saves as SocialRecord["saves"],
      shopLinkClicks: raw.shopLinkClicks as SocialRecord["shopLinkClicks"] };
  }
  if (kind === "ad") {
    const platform = choice(raw.platform, AD_PLATFORMS, "platform");
    const day = date(raw.date, "date");
    const campaignId = raw.campaignId == null ? undefined : text(raw.campaignId, "campaignId");
    const placement = raw.placement == null ? undefined : text(raw.placement, "placement");
    const campaignStatus = raw.campaignStatus == null ? undefined : choice(raw.campaignStatus, AD_STATUSES, "campaignStatus");
    if (raw.conversionTrackingVerified != null && typeof raw.conversionTrackingVerified !== "boolean") fail("conversionTrackingVerified");
    return { ...base, kind, key: `ad:${platform}:${day}:${part(campaignId)}:${part(placement)}`,
      platform, date: day, campaignId, placement, campaignStatus,
      dailyBudgetCap: raw.dailyBudgetCap as AdRecord["dailyBudgetCap"],
      spend: raw.spend as AdRecord["spend"], impressions: raw.impressions as AdRecord["impressions"],
      clicks: raw.clicks as AdRecord["clicks"], landingPageViews: raw.landingPageViews as AdRecord["landingPageViews"],
      attributedOrders: raw.attributedOrders as AdRecord["attributedOrders"],
      attributedRevenue: raw.attributedRevenue as AdRecord["attributedRevenue"],
      conversionTrackingVerified: raw.conversionTrackingVerified as boolean | undefined };
  }
  if (kind === "cart") {
    if (raw.platform !== "etsy") fail("platform");
    const windowDays = choice(String(raw.windowDays), CART_WINDOWS.map(String), "windowDays");
    const windowStart = date(raw.windowStart, "windowStart");
    const windowEnd = date(raw.windowEnd, "windowEnd");
    if (dayDiffKeys(windowStart, windowEnd) + 1 !== Number(windowDays)) fail("windowDays");
    if (raw.count == null) fail("count");
    return { ...base, kind, key: `cart:${capturedAt}:${windowDays}`,
      platform: "etsy", windowDays: Number(windowDays) as CartSnapshot["windowDays"],
      windowStart, windowEnd, count: raw.count as number };
  }
  if (kind === "inquiry") {
    if (raw.platform !== "etsy") fail("platform");
    const start = date(raw.start, "start");
    const end = date(raw.end, "end");
    if (dayDiffKeys(start, end) + 1 !== WEEK_DAYS) fail("end");
    const themesRaw = raw.themes == null ? undefined : object(raw.themes);
    if (themesRaw && Object.keys(themesRaw).length > MAX_THEMES) fail("themes");
    const themes = themesRaw && Object.fromEntries(Object.entries(themesRaw).map(([theme, count]) => {
      if (count == null) fail("themes");
      return [text(theme, "themes"), number(count, "themes", true)];
    })) as Record<string, number>;
    if (raw.count == null && raw.minimumVerified == null) fail("count");
    if (raw.orderStatusVerified != null && typeof raw.orderStatusVerified !== "boolean") fail("orderStatusVerified");
    return { ...base, kind, key: `inquiry:${start}:${end}`, platform: "etsy", start, end,
      count: raw.count as InquiryRecord["count"], minimumVerified: raw.minimumVerified as number | undefined,
      themes, orderStatusVerified: raw.orderStatusVerified as boolean | undefined };
  }
  if (kind === "economics") {
    const platform = choice(raw.platform, SHOP_PLATFORMS, "platform");
    const day = date(raw.date, "date");
    const orderId = text(raw.orderId, "orderId");
    return { ...base, kind, key: `economics:${platform}:${part(orderId)}`, platform, date: day, orderId,
      grossRevenue: raw.grossRevenue as EconomicsRecord["grossRevenue"],
      discounts: raw.discounts as EconomicsRecord["discounts"], refunds: raw.refunds as EconomicsRecord["refunds"],
      shippingCharged: raw.shippingCharged as EconomicsRecord["shippingCharged"],
      shippingCost: raw.shippingCost as EconomicsRecord["shippingCost"],
      materialsCost: raw.materialsCost as EconomicsRecord["materialsCost"],
      laborCost: raw.laborCost as EconomicsRecord["laborCost"] };
  }
  if (kind === "order_link") {
    const itemId = text(raw.itemId, "itemId");
    const platform = choice(raw.platform, ["etsy", "shopify", "other"] as const, "platform");
    const orderId = text(raw.orderId, "orderId");
    return { ...base, kind, key: `order_link:${part(itemId)}`, itemId, platform, orderId };
  }
  const effectiveAt = timestamp(raw.effectiveAt, "effectiveAt");
  const area = choice(raw.area, CHANGE_AREAS, "area");
  const summary = text(raw.summary, "summary", MAX_SUMMARY_LENGTH);
  return { ...base, kind: "change", key: `change:${effectiveAt}:${area}:${part(summary)}`,
    effectiveAt, area, summary } satisfies ChangeRecord;
}
