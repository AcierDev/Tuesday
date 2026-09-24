# Weekly reporting in Tuesday

The **Stats → Weekly Report** page and `GET /api/reporting/weekly?start=YYYY-MM-DD&end=YYYY-MM-DD` return aggregate Pacific full-day results plus the preceding equal-length period. The weekly endpoint contains no customer names, addresses, message text, tracking numbers, or external order IDs.

Set separate `REPORTING_READ_TOKEN` and `REPORTING_WRITE_TOKEN` server environment variables before use. Generate long random values (for example, `openssl rand -hex 32`). Both endpoints fail closed while their token is missing. Tokens entered on the page stay in browser memory until reload; they are not saved in local storage. The read token is required for weekly reports; the write token is required for imports. No deployment or production configuration is changed by this code.

## Fulfillment definitions

- `completedAt` is the timestamp when an item was moved to Done. It is a production completion, not proof of dispatch.
- Carrier acceptance is the **first `in_transit` tracking detail**. A created label or `pre_transit` event does not count. If the tracker lacks an `in_transit` scan, dispatch date is unknown.
- New items retain their first promised due date. When an item first moves to Done, Tuesday freezes the due date used at completion. Older items without that frozen date are reported as **unknown** in exact weekly on-time counts. Existing stats pages retain their legacy definitions.
- New completions also create a dated event, so reopening and recompleting an item does not erase its earlier week's completion. Older completions fall back to the item's current `completedAt` when no event exists.
- Counts are production items, not unique Etsy or Shopify orders. Current backlog and overdue counts are live snapshots; the prior period's backlog is not reconstructed.
- Existing dated backlog and health snapshots are attached when a snapshot exists on the selected Tuesday and preceding Tuesday. The recording time is retained because a snapshot may precede midnight. Missing dates remain unavailable.

## Import source records

`POST /api/reporting/records` accepts one JSON object or an array. Re-importing the same natural key replaces that record. Unknown fields and private message text fields are rejected. Counts and money must be nonnegative. Missing values are omitted or `null`, never supplied as zero. A record marked `quality: "complete"` needs a source URL. Include one record per complete calendar day for trustworthy weekly coverage. Set `sourceTimezone` to the dashboard's reporting timezone, especially `UTC` for Pinterest. The page has an import form, or use the API:

```sh
curl -X POST "$TUESDAY_BASE_URL/api/reporting/records" \
  -H "Authorization: Bearer $REPORTING_WRITE_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @records.json
```

Example records:

```json
[
  {"kind":"shop","platform":"etsy","date":"2026-09-16","visits":90,"listingViews":110,"favorites":3,"orders":1,"revenue":500,"quality":"complete","sourceUrl":"https://www.etsy.com/your/shops/me/stats"},
  {"kind":"social","platform":"instagram","date":"2026-09-16","reach":1000,"engagements":25,"saves":4,"shopLinkClicks":8,"quality":"complete","sourceUrl":"https://business.facebook.com/"},
  {"kind":"shop","platform":"etsy","listingId":"1033592156","date":"2026-09-16","listingViews":80,"favorites":2,"quality":"complete","sourceUrl":"https://www.etsy.com/your/shops/me/stats"},
  {"kind":"ad","platform":"meta","campaignId":"fb-only","placement":"facebook","date":"2026-09-16","campaignStatus":"active","dailyBudgetCap":25,"spend":12.50,"impressions":1000,"clicks":20,"landingPageViews":15,"conversionTrackingVerified":false,"quality":"complete","sourceUrl":"https://adsmanager.facebook.com/"},
  {"kind":"cart","platform":"etsy","capturedAt":"2026-09-23T11:00:00Z","windowDays":7,"windowStart":"2026-09-17","windowEnd":"2026-09-23","count":34,"sourceUrl":"https://www.etsy.com/your/shops/me/stats"},
  {"kind":"inquiry","platform":"etsy","start":"2026-09-16","end":"2026-09-22","count":null,"minimumVerified":2,"themes":{"customization":2},"orderStatusVerified":false},
  {"kind":"change","effectiveAt":"2026-09-20T12:00:00Z","area":"campaign","summary":"Facebook-only campaign active at $25 daily cap"}
]
```

For Shopify, import `kind: "shop"` with `platform: "shopify"` and use `visits` for sessions. Etsy shop and listing records can additionally include `organicVisits`, `paidVisits`, and `socialVisits` when the source split is reliable; leave uncertain splits unavailable. Social-profile records use `kind: "social"` and are separate from paid ad results. For Etsy Offsite Ads fees, import `kind: "ad"`, `platform: "etsy_offsite"`, and put the charged fee in `spend`; attributed sales belong in `attributedOrders` and `attributedRevenue`, not shop revenue. Import separate rows for Facebook, Instagram, Pinterest and any other paid placement. Record explicit zero spend only after verifying that a campaign had no delivery for that day. Cart snapshots are rolling windows captured on Wednesday; they are never interpreted as exact completed-week cart additions. Inquiry records contain only aggregate counts and themes.

Order cost records use `kind: "economics"`, `platform`, `orderId`, `date`, and any known `grossRevenue`, `discounts`, `refunds`, `shippingCharged`, `shippingCost`, `materialsCost`, and `laborCost`. Order IDs are stored for deduplication but excluded from weekly responses.

To link a Tuesday production item to a marketplace order, import `{"kind":"order_link","itemId":"TUESDAY_ITEM_ID","platform":"etsy","orderId":"EXTERNAL_ORDER_ID"}`. Multiple production items can link to the same external order. Weekly fulfillment reports show only channel counts and never return the IDs. Unlinked items remain in the `unknown` channel.

Etsy, Meta, Pinterest, and Shopify API credentials are not configured in this codebase. Their daily metrics therefore require import until connector access is supplied. A missing import remains **Not available** in the report. The report does not infer incremental sales from attributed revenue, clicks, or ROAS.
