# Ask Tuesday implementation

Purpose: give employees a popup beside their work that retrieves actual orders,
saved operational findings, and explicitly verified Etsy conversation snapshots.
The current repository has Gemini for other features but no free hosted chat
integration or Etsy message service. This implementation makes no inference calls.

## Design

- Mount an accessible, mobile-friendly popup in `app/layout.tsx`, outside `/access`.
- Reuse the signed site-access cookie; the simulated AuthContext is not an identity.
- A read-only question endpoint queries Mongo directly, with projections and limits.
  Do not call the legacy items GET, which can migrate held records.
- Search uses customer/order terms and explicit attention/activity/page intents.
  Results are records and quotes, never a fabricated conversational answer.
- Preserve source review dates separately from import/save timestamps. Show live
  order check time only after a successful database read.
- Saved findings are incomplete conversation evidence. Verified full-history
  snapshots may include final, proposed, and superseded agreements with message
  references. Unverified snapshots cannot establish a final agreement.
- Import via an operator script into an ignored local data file for local review;
  optional explicit publishing writes only a dedicated knowledge collection.
  Questions never write orders, messages, logs, or imported knowledge.
- No desktop OAuth token reuse, new paid dependency, or automatic Gemini calls.

## Tasks

1. Define bounded request/result/source contracts in `lib/ask-tuesday/types.ts`
   and named limits in `config/ask-tuesday.ts`.
2. Test and implement review/conversation normalization in
   `lib/ask-tuesday/knowledge.ts`: schema drift, deduplication, safe links,
   date provenance, linked message citations, incomplete histories.
3. Test and implement `lib/ask-tuesday/search.ts`: customer search, current
   filter context, held/Done exclusions for attention, overdue/rushed flags,
   framed-art exclusions, quoted findings and activity, no speculative agreements.
4. Test and implement cookie-protected request handling and a bounded read-only
   repository; gracefully disclose unavailable order/knowledge sources.
5. Implement and exercise the popup, request failure/loading behavior, source
   links, current-page context, and order navigation through the existing store.
6. Add the operator import script and concise setup documentation; generate an
   ignored local snapshot from the actual review log without publishing it.
7. Run runtime tests, focused types, and a real local browser flow. Independently
   review the change. Preserve `components/orders/name-tokens.tsx` user edits.

## Review focus

Reject unauthorized questions before reading data; never fetch or persist on a
question beyond readonly data queries; never reinterpret an issue-key number as
an Etsy order ID; reject unsafe URLs and incomplete final-agreement evidence;
show unavailable data and truncation instead of pretending full coverage.

The original implementation phase excluded release changes. The user's later
request authorized the recurring review update and then a verified live release.

## Verification

- All 174 repository tests pass, including 55 Ask Tuesday tests.
- Focused TypeScript validation passes; the diff has no whitespace errors.
- The actual authenticated POST route returned HTTP 200 with live Mongo orders
  and dated saved findings. No model or live Etsy calls occurred.
- The local preview server is ready on loopback port 3000 with one listener.
  Visual browser review remains unverified because the built-in browser's admin
  security policy check is unavailable; no alternate browser was used.
- Independent review findings were repaired and covered by regression tests.
