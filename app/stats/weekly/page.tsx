"use client";

import { useState } from "react";

import { laDayKey, shiftDayKey } from "@/lib/debt-metrics";
import type { buildFulfillmentWeek } from "@/lib/reporting/fulfillment";
import type { summarizeMarketingWeek, Metric } from "@/lib/reporting/marketing";

const REPORT_WEEK_DAYS = 7;
const TUESDAY_WEEKDAY_UTC = 2;
const CURRENCY_DECIMALS = 2;

type Fulfillment = ReturnType<typeof buildFulfillmentWeek>;
type Marketing = ReturnType<typeof summarizeMarketingWeek>;
type Week = {
  window: { start: string; end: string };
  fulfillment: Fulfillment;
  marketing: Marketing;
  datedSnapshots: {
    backlog: { squares: number; recordedAt: number } | null;
    health: { score: number; recordedAt: number } | null;
  };
};
type Report = { generatedAt: string; timeZone: string; note: string; current: Week; prior: Week };

function defaultWindow() {
  const today = laDayKey();
  const weekday = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const daysBack = (weekday - TUESDAY_WEEKDAY_UTC + REPORT_WEEK_DAYS) % REPORT_WEEK_DAYS || REPORT_WEEK_DAYS;
  const end = shiftDayKey(today, -daysBack);
  return { start: shiftDayKey(end, -(REPORT_WEEK_DAYS - 1)), end };
}

function number(value: number | null | undefined, money = false): string {
  if (value == null) return "Not available";
  return money
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: CURRENCY_DECIMALS }).format(value)
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: CURRENCY_DECIMALS }).format(value);
}

function metric(value: Metric, money = false): string {
  return `${number(value.value, money)}${value.complete ? "" : ` · ${value.coveredDays} days captured; incomplete`}`;
}

function percent(value: number | null): string {
  return value == null ? "Not available" : `${number(value)}%`;
}

function ShopRow({ label, current, prior }: { label: string; current: Marketing["shops"]["etsy"]; prior: Marketing["shops"]["etsy"] }) {
  return <tr className="border-t border-white/10">
    <th className="py-2 pr-4 text-left font-medium">{label}</th>
    <td className="py-2 pr-4">{metric(current.favorites)} / {metric(current.listingViews)} ({number(current.favoritesPer100Views)} per 100)</td>
    <td className="py-2">{metric(prior.favorites)} / {metric(prior.listingViews)} ({number(prior.favoritesPer100Views)} per 100)</td>
  </tr>;
}

export default function WeeklyReportPage() {
  const initial = defaultWindow();
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [readToken, setReadToken] = useState("");
  const [writeToken, setWriteToken] = useState("");
  const [importText, setImportText] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadReport() {
    setError("");
    setLoading(true);
    try {
      const params = new URLSearchParams({ start, end });
      const response = await fetch(`/api/reporting/weekly?${params}`, {
        headers: { Authorization: `Bearer ${readToken}` },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Report unavailable.");
      setReport(result as Report);
    } catch (cause) {
      setReport(null);
      setError(cause instanceof Error ? cause.message : "Report unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function importRecords() {
    setImportMessage("");
    try {
      const response = await fetch("/api/reporting/records", {
        method: "POST",
        headers: { Authorization: `Bearer ${writeToken}`, "Content-Type": "application/json" },
        body: importText,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Import failed.");
      setImportMessage(`${result.imported} record(s) imported. Reload the report to see them.`);
      setImportText("");
    } catch (cause) {
      setImportMessage(cause instanceof Error ? cause.message : "Import failed.");
    }
  }

  const c = report?.current;
  const p = report?.prior;
  const adRows = c && p ? [
    ["Etsy Ads", c.marketing.ads.etsyAds, p.marketing.ads.etsyAds],
    ["Etsy Offsite fees", c.marketing.ads.etsyOffsite, p.marketing.ads.etsyOffsite],
    ["Meta Facebook", c.marketing.ads.meta.facebook, p.marketing.ads.meta.facebook],
    ["Meta Instagram", c.marketing.ads.meta.instagram, p.marketing.ads.meta.instagram],
    ["Meta other", c.marketing.ads.meta.other, p.marketing.ads.meta.other],
    ["Pinterest", c.marketing.ads.pinterest, p.marketing.ads.pinterest],
    ["Other paid", c.marketing.ads.other, p.marketing.ads.other],
  ] as const : [];

  return <div className="space-y-6">
    <header>
      <h2 className="text-3xl font-semibold">Weekly Report</h2>
      <p className="mt-2 text-sm text-slate-400">Pacific full-day periods. Order-item completions and carrier scans are separate; platform data requires dated imports.</p>
    </header>

    <section className="glass-surface rounded-2xl p-5 space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Start <input aria-label="Start date" type="date" value={start} onChange={(event) => setStart(event.target.value)} className="mt-1 block rounded bg-slate-900 p-2" /></label>
        <label className="text-sm">End <input aria-label="End date" type="date" value={end} onChange={(event) => setEnd(event.target.value)} className="mt-1 block rounded bg-slate-900 p-2" /></label>
        <label className="text-sm">Read token <input aria-label="Read token" type="password" autoComplete="off" value={readToken} onChange={(event) => setReadToken(event.target.value)} className="mt-1 block rounded bg-slate-900 p-2" /></label>
        <button type="button" onClick={loadReport} disabled={loading} className="rounded bg-fuchsia-600 px-4 py-2 text-sm font-semibold disabled:opacity-50">{loading ? "Loading…" : "Load report"}</button>
      </div>
      <p className="text-xs text-slate-400">Tokens stay in this page’s memory and are sent only to Tuesday’s reporting API. Set REPORTING_READ_TOKEN and REPORTING_WRITE_TOKEN on the server.</p>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    </section>

    {c && p && <>
      <section className="glass-surface rounded-2xl p-5">
        <h3 className="text-lg font-semibold">Fulfillment · {c.window.start}–{c.window.end}</h3>
        <p className="mt-1 text-xs text-slate-400">Current backlog is as of {new Date(c.fulfillment.asOf).toLocaleString()}; it is not a historical week-end snapshot.</p>
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div><p className="text-xs text-slate-400">Completed items</p><p className="text-2xl font-semibold">{c.fulfillment.completedItems}</p><p className="text-xs text-slate-400">prior {p.fulfillment.completedItems}</p></div>
          <div><p className="text-xs text-slate-400">Carrier scans</p><p className="text-2xl font-semibold">{c.fulfillment.carrierAcceptedItems}</p><p className="text-xs text-slate-400">prior {p.fulfillment.carrierAcceptedItems}</p></div>
          <div><p className="text-xs text-slate-400">On time / dated completions</p><p className="text-2xl font-semibold">{c.fulfillment.onTimeCompleted} / {c.fulfillment.onTimeCompleted + c.fulfillment.lateCompleted}</p><p className="text-xs text-slate-400">{c.fulfillment.unknownDueAtCompletion} unknown promise dates</p></div>
          <div><p className="text-xs text-slate-400">Overdue now / backlog</p><p className="text-2xl font-semibold">{c.fulfillment.overdueNow} / {Object.values(c.fulfillment.backlogByStatus).reduce((a, b) => a + b, 0)}</p><p className="text-xs text-slate-400">{number(c.fulfillment.backlogSquares)} squares; {c.fulfillment.backlogUnknownSize} unknown sizes</p></div>
        </div>
        <p className="mt-4 text-sm text-slate-300">Lead time: median {number(c.fulfillment.leadTimeDays.median)} days, P90 {number(c.fulfillment.leadTimeDays.p90)} days across {c.fulfillment.leadTimeDays.count} completed items.</p>
        <p className="mt-1 text-sm text-slate-300">Original promise: {c.fulfillment.onTimeOriginalPromise} on time, {c.fulfillment.lateOriginalPromise} late, {c.fulfillment.unknownOriginalPromise} unknown; {c.fulfillment.promiseExtensions} promises extended before completion.</p>
        <p className="mt-1 text-sm text-slate-300">Completed by linked sales channel: Etsy {c.fulfillment.completedBySalesChannel.etsy}, Shopify {c.fulfillment.completedBySalesChannel.shopify}, other {c.fulfillment.completedBySalesChannel.other}, unknown {c.fulfillment.completedBySalesChannel.unknown}.</p>
        <p className="mt-1 text-sm text-slate-300">Tuesday snapshots: backlog {number(c.datedSnapshots.backlog?.squares)} squares vs {number(p.datedSnapshots.backlog?.squares)} prior; health score {number(c.datedSnapshots.health?.score)} vs {number(p.datedSnapshots.health?.score)}. Snapshot times may precede midnight.</p>
      </section>

      <section className="glass-surface rounded-2xl p-5 overflow-x-auto">
        <h3 className="text-lg font-semibold">Shop performance</h3>
        <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-slate-400"><th>Source</th><th>Favorites / listing views · current</th><th>Prior</th></tr></thead><tbody>
          <ShopRow label="Etsy shop" current={c.marketing.shops.etsy} prior={p.marketing.shops.etsy} />
          {Object.entries(c.marketing.etsyListings).map(([id, values]) => {
            const previous = p.marketing.etsyListings[id];
            return <tr key={id} className="border-t border-white/10"><th className="py-2 pr-4 text-left font-medium">Etsy listing {id}</th><td>{metric(values.favorites)} / {metric(values.listingViews)} ({number(values.favoritesPer100Views)} per 100)</td><td>{previous ? `${metric(previous.favorites)} / ${metric(previous.listingViews)} (${number(previous.favoritesPer100Views)} per 100)` : "Not available"}</td></tr>;
          })}
        </tbody></table>
        <p className="mt-3 text-sm">Etsy: {metric(c.marketing.shops.etsy.visits)} visits, {metric(c.marketing.shops.etsy.orders)} orders, {metric(c.marketing.shops.etsy.revenue, true)} revenue. Prior: {metric(p.marketing.shops.etsy.orders)} orders, {metric(p.marketing.shops.etsy.revenue, true)}.</p>
        <p className="mt-1 text-sm">Etsy traffic, where verified: organic {metric(c.marketing.shops.etsy.organicVisits)}, paid {metric(c.marketing.shops.etsy.paidVisits)}, social {metric(c.marketing.shops.etsy.socialVisits)}. Source buckets can overlap and are not sales attribution.</p>
        <p className="mt-1 text-sm">Shopify: {metric(c.marketing.shops.shopify.visits)} sessions, {metric(c.marketing.shops.shopify.orders)} orders, {metric(c.marketing.shops.shopify.revenue, true)} sales. Kept separate from Etsy.</p>
      </section>

      <section className="glass-surface rounded-2xl p-5 overflow-x-auto">
        <h3 className="text-lg font-semibold">Social profiles · separate from paid ads</h3>
        <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-slate-400"><th>Profile</th><th>Reach</th><th>Engagements</th><th>Saves</th><th>Shop-link clicks</th></tr></thead><tbody>
          {(["facebook", "instagram", "pinterest"] as const).map((platform) => {
            const row = c.marketing.social[platform];
            return <tr key={platform} className="border-t border-white/10"><th className="py-2 pr-3 text-left font-medium capitalize">{platform}</th><td>{metric(row.reach)}</td><td>{metric(row.engagements)}</td><td>{metric(row.saves)}</td><td>{metric(row.shopLinkClicks)}</td></tr>;
          })}
        </tbody></table>
      </section>

      <section className="glass-surface rounded-2xl p-5">
        <h3 className="text-lg font-semibold">Buyer intent</h3>
        <p className="mt-2 text-sm">Rolling Etsy carts captured Wednesday: 7 days {number(c.marketing.cartSnapshots.last7Days?.count)}; 30 days {number(c.marketing.cartSnapshots.last30Days?.count)}. Prior Wednesday: {number(p.marketing.cartSnapshots.last7Days?.count)} / {number(p.marketing.cartSnapshots.last30Days?.count)}. These are snapshots, not exact weekly cart additions.</p>
        <p className="mt-2 text-sm">Distinct new presale conversations: {c.marketing.inquiries?.count == null ? c.marketing.inquiries?.minimumVerified != null ? `At least ${c.marketing.inquiries.minimumVerified}; exact total unavailable` : "Not available" : number(c.marketing.inquiries.count)}.</p>
      </section>

      <section className="glass-surface rounded-2xl p-5 overflow-x-auto">
        <h3 className="text-lg font-semibold">Paid channels</h3>
        <p className="mt-2 text-sm">Verified upfront spend: {number(c.marketing.paidSpend.verifiedUpfrontSubtotal, true)} ({number(c.marketing.paidSpend.averageUpfrontPerDay, true)}/day), prior {number(p.marketing.paidSpend.verifiedUpfrontSubtotal, true)}. Offsite fees: {number(c.marketing.paidSpend.verifiedOffsiteFees, true)}. Verified charge subtotal: {number(c.marketing.paidSpend.verifiedChargesSubtotal, true)}. Observed active caps: {number(c.marketing.paidSpend.activeDailyBudgetCapsObserved, true)}/day.</p>
        {(c.marketing.paidSpend.incompleteChannels.length > 0 ||
          !c.marketing.paidSpend.offsiteFeesComplete) &&
          <p className="mt-1 text-xs text-amber-300">Charge subtotal is incomplete: {[
            ...c.marketing.paidSpend.incompleteChannels,
            ...(!c.marketing.paidSpend.offsiteFeesComplete ? ["etsy_offsite"] : []),
          ].join(", ")}. An absent channel is not $0.</p>}
        <table className="mt-3 w-full text-sm"><thead><tr className="text-left text-slate-400"><th>Channel</th><th>Source timezone</th><th>Spend current / prior</th><th>Impressions</th><th>Clicks</th><th>Landing-page views</th><th>CTR / CPC / CPM</th><th>Attributed orders / revenue</th><th>CPA / ROAS</th></tr></thead><tbody>
          {adRows.map(([name, current, prior]) => <tr key={name} className="border-t border-white/10"><th className="py-2 pr-3 text-left font-medium">{name}</th><td className="pr-3">{current.sourceTimezones.join(", ") || "Not available"}</td><td className="pr-3">{metric(current.spend, true)} / {metric(prior.spend, true)}</td><td className="pr-3">{metric(current.impressions)}</td><td className="pr-3">{metric(current.clicks)}</td><td className="pr-3">{metric(current.landingPageViews)}</td><td className="pr-3">{percent(current.ctrPercent)} / {number(current.cpc, true)} / {number(current.cpm, true)}</td><td className="pr-3">{metric(current.attributedOrders)} / {metric(current.attributedRevenue, true)}</td><td>{number(current.cpa, true)} / {number(current.roas)}</td></tr>)}
        </tbody></table>
        <p className="mt-3 text-xs text-slate-400">Budget caps are recorded separately from spend. Offsite fees and attributed revenue are not added to shop sales.</p>
        <ul className="mt-2 text-xs text-slate-400">{c.marketing.ads.campaignDelivery.map((row) => <li key={`${row.platform}:${row.campaignId ?? row.placement}`}>{row.platform} {row.campaignId ?? row.placement ?? "all"}: {row.status}, cap {number(row.dailyBudgetCap, true)}/day as of {row.observedDate}; weekly spend {metric(row.spend, true)}{row.status === "active" && row.spend.complete && row.spend.value === 0 ? " · active with no delivery" : ""}</li>)}</ul>
      </section>

      <section className="glass-surface rounded-2xl p-5">
        <h3 className="text-lg font-semibold">Order costs and verified changes</h3>
        <p className="mt-2 text-sm">Etsy cost records: {c.marketing.economics.etsy.orderRecords}; Shopify: {c.marketing.economics.shopify.orderRecords}. Etsy material cost {metric(c.marketing.economics.etsy.materialsCost, true)}, labor {metric(c.marketing.economics.etsy.laborCost, true)}, shipping {metric(c.marketing.economics.etsy.shippingCost, true)}.</p>
        <p className="mt-1 text-sm">Known Etsy contribution: {number(c.marketing.economics.etsy.contribution.value, true)} across {c.marketing.economics.etsy.contribution.completeOrders} fully costed order records. This is separate from shop sales and ad attribution.</p>
        {c.marketing.changes.length ? <ul className="mt-3 list-disc pl-5 text-sm">{c.marketing.changes.map((change) => <li key={`${change.effectiveAt}:${change.summary}`}>{change.effectiveAt.slice(0, 10)} · {change.area}: {change.summary}</li>)}</ul> : <p className="mt-2 text-sm text-slate-400">No changes recorded for this period.</p>}
      </section>
    </>}

    <details className="glass-surface rounded-2xl p-5">
      <summary className="cursor-pointer font-semibold">Import dated reporting records</summary>
      <p className="mt-3 text-sm text-slate-400">Paste one JSON record or an array. Imports replace records with the same natural key; missing metrics remain unavailable. Use aggregate inquiry counts and themes only.</p>
      <label className="mt-3 block text-sm">Write token <input type="password" autoComplete="off" value={writeToken} onChange={(event) => setWriteToken(event.target.value)} className="mt-1 block w-full rounded bg-slate-900 p-2" /></label>
      <label className="mt-3 block text-sm">JSON records <textarea value={importText} onChange={(event) => setImportText(event.target.value)} rows={8} className="mt-1 block w-full rounded bg-slate-900 p-2 font-mono text-xs" /></label>
      <button type="button" onClick={importRecords} className="mt-3 rounded bg-fuchsia-600 px-4 py-2 text-sm font-semibold">Import</button>
      {importMessage && <p role="status" className="mt-2 text-sm">{importMessage}</p>}
    </details>
  </div>;
}
