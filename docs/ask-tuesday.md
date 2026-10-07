# Ask Tuesday

The persistent production website server automatically checks the whole active
board every minute, even with no employee browser open and while the owner's Mac
is asleep or locked. The employee popup also refreshes current active statuses
every minute while Tuesday is visible and on returning to the window. A badge
surfaces recorded issues; opening the popup shows evidence and source dates.
Employees can also search orders, activity, saved review
findings and explicitly imported Etsy conversation snapshots.
Affected active orders have a small issue icon beside their name on desktop and
mobile. Clicking it opens expandable order concerns with message links when
available. These icons share the popup's checks; they do not poll per order.
Known Done exclusions survive list reloads and apply to cached search results.
A separate blue chat icon opens a saved AI conversation summary, useful
highlights, the next action when supported, and the actual message thread.
Customers can have chat summaries without having an issue. A recorded message
flag can open a pending-summary panel, but never supplies invented message text.

Automatic rules flag overdue unpaused work, explicit artwork double-check
markers and unresolved saved findings. Findings with evidence but unknown
resolution remain visible for review. Due-soon dates, rush priority, ordinary
staff progress and the message indicator alone are not treated as errors. Holds,
excluded framed-art rows and resolved findings are respected. Done orders are
excluded from all checks and searches, including their linked saved messages and
activity. A separate status-only board read prevents completed orders from
crowding out active results. If current statuses cannot be checked completely,
saved messages and activity are withheld and coverage is marked incomplete.
Explicit conversation/order links take precedence over customer-name matches;
a repeat buyer's active order remains eligible. Failures and record
limits remain visible; zero findings is not a guarantee that everything is correct.

Interactive order searches and issue checks use recorded data. The server can
prepare missing AI summaries from verified saved messages using the existing
Gemini connection. It makes no live Etsy API calls. Collecting fresh Etsy message
evidence still depends on the recurring browser reviewer. Operational summaries
do not establish final artwork agreements.

## Independent server checks

Root `instrumentation.ts` starts the background loop with the existing
production `next start` / PM2 process. No additional cron service is needed on a
persistent Node host. The loop starts immediately and repeats at the named
`TUESDAY_MONITOR.intervalMs`; a singleton and expiring Mongo lease prevent
overlap across instances. It writes run status and the last scan only to
`ask-tuesday-monitor-${NEXT_PUBLIC_MODE}`. The stored scan contains counts and
status; customer details remain in the current employee response. Failed runs
retain the last successful scan, record a sanitized failure, and retry on later ticks. Employee requests
still check current active statuses rather than serving that saved scan.

Automatic timers are disabled during development, builds and known serverless
environments. Set `ASK_TUESDAY_MONITOR_ENABLED=false` for local production
previews or to disable the worker. Hosted production needs the same existing
`MONGODB_URI` and `NEXT_PUBLIC_MODE` as the application. Running the server from
the Mac does not make it independent; the updated code must run on the host.

With `GEMINI_API_KEY` on that host, bounded batches prepare summaries only for
verified conversations explicitly linked to current active orders. Existing
summaries are reused. Cache records in `ask-tuesday-summaries-${NEXT_PUBLIC_MODE}`
are bound to the complete source fingerprint and validated quotes; changes to
messages invalidate them. Summary generation never changes the source-check
date or overwrites imported knowledge. Missing credentials and provider failures
leave messages and current order checks available. Numeric budgets, model limits
and retry controls are named in `config/tuesday-summaries.ts`. Set
`ASK_TUESDAY_MONITOR_SUMMARIES_ENABLED=false` to disable model calls; pending
uncached summaries then remain unavailable rather than counting as prepared.

This server worker does not fetch new Etsy messages. Etsy's published API has no
conversation endpoints/scopes and its webhooks do not include message events.
Fresh message collection while the Mac sleeps needs a separately authorized
always-on source or browser session. A local Codex schedule alone cannot provide
that. See [Etsy support's API clarification](https://github.com/etsy/open-api/discussions/1645)
and [Etsy webhook events](https://developers.etsy.com/documentation/essentials/webhooks/).

## Import saved evidence

Run from the Tuesday repository:

```sh
node --env-file=.env.local --import tsx scripts/import-ask-tuesday.ts --review /absolute/path/everwood-daily-operational-review-log.json
```

This writes the ignored `data/ask-tuesday-knowledge.json`. It does not connect to
Mongo. `--out /absolute/path/snapshot.json` changes the local destination.
`--messages /absolute/path/messages.json` adds verified conversation snapshots.
Unknown fields are discarded. Finding aliases are normalized and duplicate issue
keys are combined; conflicting resolutions remain unknown. Only HTTPS links on
Etsy, Tuesday, FedEx, UPS, and USPS domains are retained.

The actual October 6 review contains 27 issue summaries, including resolved and
watch items, but no complete transcripts. Its review date remains October 6;
the source save time and import time are separate fields. An import does not
refresh the evidence. Excluded framed-art customer rows are taken only from the
review's explicit audit coverage; training notes do not cause size conversions or
new artwork conclusions.

To publish an inspected snapshot to the hosted app, explicitly add `--publish`:

```sh
node --env-file=.env.local --import tsx scripts/import-ask-tuesday.ts --review /absolute/path/everwood-daily-operational-review-log.json --publish
```

Publishing requires the existing `MONGODB_URI` and `NEXT_PUBLIC_MODE`. It upserts
only document `id: latest` in `ask-tuesday-knowledge-${NEXT_PUBLIC_MODE}`. It does
not change orders, messages, or the operational review log. The server loads
that collection first and uses the local file as a fallback. The ignored local
file alone is not available to a hosted deployment. Keep customer snapshots out
of Git; local output files are created with owner-only permissions.

## Verified conversations

The optional file has this shape; replace the example with observed evidence:

```json
{
  "conversations": [{
    "threadId": "1700000001",
    "buyerName": "Example Buyer",
    "checkedAt": "2026-10-06T21:00:00Z",
    "historyComplete": true,
    "orderIds": ["4180000001"],
    "messages": [
      { "id": "buyer-1", "sentAt": "2026-10-06T19:00:00Z", "sender": "buyer", "text": "Use the white palette." },
      { "id": "seller-1", "sentAt": "2026-10-06T20:00:00Z", "sender": "seller", "text": "Confirmed white." }
    ],
    "agreements": [{
      "status": "final",
      "text": "White palette confirmed",
      "messageIds": ["buyer-1", "seller-1"]
    }],
    "summary": {
      "text": "The buyer requested a white palette and the seller confirmed it.",
      "highlights": ["White palette confirmed."],
      "nextAction": null,
      "evidence": [
        { "sender": "buyer", "text": "Use the white palette." },
        { "sender": "seller", "text": "Confirmed white." }
      ]
    }
  }]
}
```

`threadId` must be a numeric Etsy thread identifier supplied as a string.
`orderIds` must be explicitly linked string identifiers; an issue-key number is
never assumed to be an order ID. `checkedAt` must include a timezone and cannot
be later than import time. Each message needs a unique identifier, buyer/seller
sender, nonempty text, and a timestamp no later than the check.

Set `historyComplete: true` only after reading the complete relevant history,
including expanded messages. Invalid, duplicate, or truncated messages remove
that certification. A `final` agreement is retained only with complete history
and nonempty citations that all match retained message IDs. Invalid final claims
are omitted. `proposal` and `superseded` claims remain separate and also require
valid message citations. The popup renders saved text rather than synthesizing a
new agreement. This validates provenance structure; the operator remains
responsible for faithful transcription and correct agreement labels.

The optional AI summary is prepared by the existing Codex message reviewer after
reading the actual active-purchase conversation. It requires a faithful buyer
quote; when verified messages are supplied, every summary quote must occur in a
retained message from the same sender. Summary length, highlights and evidence
are bounded by the named `maxSummary*` settings. Invalid or conflicting summaries
are discarded. A summary with observed quotes but unavailable message timestamps
may be exported with empty messages and agreements and `historyComplete: false`;
the employee panel clearly shows incomplete history. Source-check time stays
distinct from message time. Summaries do not create final-agreement certification.

## Recurring message collection

The existing “Morning Etsy orders to Tuesday” heartbeat now runs hourly. It
preserves its full morning review and authorized intake at or after 7 am Pacific;
other runs perform read-only issue patrols. It reviews changed or relevant
unresolved buyer histories, preserves the complete issue backlog, exports
verified snapshots into `data/ask-tuesday-conversations.json`, then uses the
importer's explicit `--publish` step. It stays quiet while findings are unchanged
or non-actionable. Patrols do not modify orders or send customer messages.
It also collects summaries for every eligible active customer with buyer
messages, even without an unresolved issue. Initial catch-up is limited to active
work; later patrols update changed threads and newly linked active purchases.
Done orders and their histories remain excluded.

This local Codex message collector needs the computer awake, the app running and an
accessible signed-in built-in browser. See the official
[scheduled task guidance](https://learn.chatgpt.com/docs/automations). It is
separate from the independent production server's minute-by-minute checks.
Source-access failures leave previous evidence dated honestly. Missing message
timestamps or incomplete history prevent a full transcript/final-agreement claim;
faithful quotes may still be saved as findings with limitations. The initial
published snapshot has 27 real dated review findings and no complete transcripts.
Training material stays reference-only. The website code still needs normal
deployment before a hosted instance can display these new features.

The existing Gemini API connection is separate from a ChatGPT subscription.
Sign in with ChatGPT is not
implemented here and requires OpenAI's applicable onboarding and production
approval; a ChatGPT subscription alone does not provision this website's hosted
inference. It also does not grant access to prior ChatGPT history or Etsy data.
See the official [SIWC quickstart](https://developers.openai.com/siwc/quickstart)
and [Sign in with ChatGPT guidance](https://developers.openai.com/cookbook/articles/sign-in-with-chatgpt).
Any later inference or live Etsy integration needs its own authorized credentials
and access flow; desktop tokens must not be reused.
